using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class CachedJobServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly LocalHireDbContext _db;
    private readonly CachedJobService _service;

    public CachedJobServiceTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<LocalHireDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new LocalHireDbContext(options);
        _db.Database.EnsureCreated();
        _service = new CachedJobService(
            new JobService(_db),
            new MemoryCache(new MemoryCacheOptions()),
            new JobCacheVersion());
    }

    [Fact]
    public async Task Employer_jobs_second_read_is_served_from_cache()
    {
        var (employerId, jobId) = await SeedEmployerAndJobAsync();

        var first = await _service.GetJobsForEmployerAsync(employerId, CancellationToken.None);
        _db.JobPosts.Remove(await _db.JobPosts.FindAsync(jobId)
            ?? throw new InvalidOperationException());
        await _db.SaveChangesAsync();

        var second = await _service.GetJobsForEmployerAsync(employerId, CancellationToken.None);

        Assert.Single(first);
        Assert.Single(second);
        Assert.Equal(jobId, second[0].Id);
    }

    [Fact]
    public async Task Successful_create_invalidates_cached_job_queries()
    {
        var (employerId, _) = await SeedEmployerAndJobAsync();
        var first = await _service.GetJobsForEmployerAsync(employerId, CancellationToken.None);

        await _service.CreateJobAsync(
            new CreateJobPostRequest("Stock Clerk", "Restock shelves", "Corner Shop", "Bandra"),
            employerId,
            CancellationToken.None);
        var refreshed = await _service.GetJobsForEmployerAsync(employerId, CancellationToken.None);

        Assert.Single(first);
        Assert.Equal(2, refreshed.Count);
        Assert.Contains(refreshed, job => job.Title == "Stock Clerk");
    }

    [Fact]
    public async Task Explicit_location_candidate_searches_share_cache_across_employers()
    {
        var firstEmployer = Employer("first", "Karnataka");
        var secondEmployer = Employer("second", "Telangana");
        var worker = Worker("worker", "Karnataka", 12.97, 77.64);
        _db.Users.AddRange(firstEmployer, secondEmployer, worker);
        await _db.SaveChangesAsync();

        var first = await _service.GetNearbyCandidatesAsync(
            12.97, 77.64, null, null, firstEmployer.Id, CancellationToken.None);
        _db.Users.Remove(worker);
        await _db.SaveChangesAsync();
        var second = await _service.GetNearbyCandidatesAsync(
            12.97, 77.64, null, null, secondEmployer.Id, CancellationToken.None);

        Assert.Single(first);
        Assert.Single(second);
        Assert.Equal(first[0].Id, second[0].Id);
    }

    [Fact]
    public async Task Default_candidate_searches_remain_scoped_to_the_employer_state()
    {
        var firstEmployer = Employer("first", "Karnataka");
        var secondEmployer = Employer("second", "Telangana");
        _db.Users.AddRange(
            firstEmployer,
            secondEmployer,
            Worker("karnataka-worker", "Karnataka"),
            Worker("telangana-worker", "Telangana"));
        await _db.SaveChangesAsync();

        var first = await _service.GetNearbyCandidatesAsync(
            null, null, null, null, firstEmployer.Id, CancellationToken.None);
        var second = await _service.GetNearbyCandidatesAsync(
            null, null, null, null, secondEmployer.Id, CancellationToken.None);

        Assert.Single(first);
        Assert.Equal("Karnataka", first[0].State);
        Assert.Single(second);
        Assert.Equal("Telangana", second[0].State);
    }

    private async Task<(Guid EmployerId, Guid JobId)> SeedEmployerAndJobAsync()
    {
        var employer = new User
        {
            Id = Guid.NewGuid(),
            Name = "Pat",
            Email = $"pat-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = UserRole.Hiring,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        var job = new JobPost
        {
            Id = Guid.NewGuid(),
            EmployerId = employer.Id,
            Title = "Cashier",
            Description = "Front desk",
            WorkplaceName = "Corner Shop",
            CityArea = "Bandra",
            CreatedAt = DateTimeOffset.UtcNow,
        };
        _db.Users.Add(employer);
        _db.JobPosts.Add(job);
        await _db.SaveChangesAsync();
        return (employer.Id, job.Id);
    }

    private static User Employer(string name, string state) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Email = $"{name}-{Guid.NewGuid():N}@example.com",
        PasswordHash = "hash",
        Role = UserRole.Hiring,
        State = state,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    private static User Worker(string name, string state, double? lat = null, double? lng = null) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Email = $"{name}-{Guid.NewGuid():N}@example.com",
        PasswordHash = "hash",
        Role = UserRole.LookingForWork,
        State = state,
        Latitude = lat,
        Longitude = lng,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
