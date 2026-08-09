using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class WorkerJobSearchTests
{
    [Fact]
    public async Task Paged_job_search_reaches_results_after_the_legacy_cap()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<LocalHireDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var db = new LocalHireDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var worker = User("worker", UserRole.LookingForWork, "Karnataka");
        var employer = User("employer", UserRole.Hiring, "Karnataka");
        db.Users.AddRange(worker, employer);
        db.JobPosts.AddRange(Enumerable.Range(0, 65).Select(index =>
            Job(employer.Id, $"Role {index:D2}", "Bengaluru", "Karnataka", EmploymentType.FullTime)));
        await db.SaveChangesAsync();

        var service = new JobService(db, new CandidateAccessPolicy(db), new NotificationService(db));
        var first = await service.SearchJobsAsync(
            null, null, null, null, worker.Id, new PagingRequest(1, 20), CancellationToken.None);
        var fourth = await service.SearchJobsAsync(
            null, null, null, null, worker.Id, new PagingRequest(4, 20), CancellationToken.None);

        Assert.Equal(65, first.TotalCount);
        Assert.Equal(4, first.TotalPages);
        Assert.Equal(20, first.Items.Count);
        Assert.Equal(5, fourth.Items.Count);
        Assert.Empty(first.Items.Select(item => item.Id).Intersect(fourth.Items.Select(item => item.Id)));
    }

    [Fact]
    public async Task Jobs_default_to_worker_state_but_typed_search_can_find_other_states()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<LocalHireDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var db = new LocalHireDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var worker = User("worker", UserRole.LookingForWork, "Karnataka");
        var employer = User("employer", UserRole.Hiring, "Karnataka");
        db.Users.AddRange(worker, employer);
        db.JobPosts.AddRange(
            Job(employer.Id, "Bengaluru Cashier", "Bengaluru", "Karnataka", EmploymentType.FullTime),
            Job(employer.Id, "Hyderabad Driver", "Hyderabad", "Telangana", EmploymentType.PartTime));
        await db.SaveChangesAsync();

        var service = new JobService(
            db,
            new CandidateAccessPolicy(db),
            new NotificationService(db));
        var defaults = await service.GetNearbyJobsAsync(
            null, null, null, null, worker.Id, CancellationToken.None);
        var searched = await service.GetNearbyJobsAsync(
            null, null, "Hyderabad", null, worker.Id, CancellationToken.None);

        Assert.Single(defaults);
        Assert.Equal("Karnataka", defaults[0].State);
        Assert.Single(searched);
        Assert.Equal("Telangana", searched[0].State);
        var detail = await service.GetActiveJobAsync(defaults[0].Id, CancellationToken.None);
        Assert.Equal("Bengaluru Cashier", detail.Title);
    }

    [Fact]
    public async Task Coordinate_text_search_caps_the_ranked_candidate_set()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<LocalHireDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var db = new LocalHireDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var worker = User("worker", UserRole.LookingForWork, "Karnataka");
        var employer = User("employer", UserRole.Hiring, "Karnataka");
        db.Users.AddRange(worker, employer);
        db.JobPosts.AddRange(Enumerable.Range(0, 205).Select(index =>
        {
            var job = Job(employer.Id, $"Ranked Role {index}", "Bengaluru", "Karnataka", EmploymentType.FullTime);
            job.Latitude = 12.97 + index * 0.0001;
            job.Longitude = 77.64;
            return job;
        }));
        await db.SaveChangesAsync();

        var service = new JobService(db, new CandidateAccessPolicy(db), new NotificationService(db));
        var result = await service.SearchJobsAsync(
            12.97, 77.64, "Ranked", null, worker.Id,
            new PagingRequest(1, 100), CancellationToken.None);

        Assert.Equal(200, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.Equal(100, result.Items.Count);
    }

    private static User User(string name, UserRole role, string state) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Email = $"{name}@example.com",
        PasswordHash = "hash",
        Role = role,
        State = state,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    private static JobPost Job(
        Guid employerId, string title, string city, string state, EmploymentType employmentType) => new()
    {
        Id = Guid.NewGuid(),
        EmployerId = employerId,
        Title = title,
        Description = title,
        WorkplaceName = "Local business",
        CityArea = city,
        State = state,
        EmploymentType = employmentType,
        CreatedAt = DateTimeOffset.UtcNow,
    };
}
