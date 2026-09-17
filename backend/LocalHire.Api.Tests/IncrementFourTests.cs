using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class IncrementFourTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private LocalHireDbContext _db = null!;
    private JobService _jobs = null!;
    private User _employer = null!;
    private JobPost _job = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new LocalHireDbContext(new DbContextOptionsBuilder<LocalHireDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _jobs = new JobService(_db, new CandidateAccessPolicy(_db), new NotificationService(_db));
        _employer = new User
        {
            Id = Guid.NewGuid(), Name = "Employer", Email = "employer@example.com", PasswordHash = "hash",
            Role = UserRole.Hiring, CreatedAt = DateTimeOffset.UtcNow
        };
        _job = new JobPost
        {
            Id = Guid.NewGuid(), EmployerId = _employer.Id, Title = "Cashier", Description = "Front desk",
            WorkplaceName = "Corner Shop", CityArea = "Bandra", State = "Maharashtra",
            IsActive = true, CreatedAt = DateTimeOffset.UtcNow
        };
        _db.AddRange(_employer, _job);
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task Stale_job_edits_conflict_and_public_reads_only_return_active_fields()
    {
        var publicJob = await _jobs.GetPublicJobAsync(_job.Id, CancellationToken.None);
        var first = await _jobs.UpdateJobAsync(_job.Id, Request("Senior Cashier", 1), _employer.Id, CancellationToken.None);

        Assert.Equal("Cashier", publicJob.Title);
        Assert.Equal(2, first.Version);
        await Assert.ThrowsAsync<ConflictException>(() =>
            _jobs.UpdateJobAsync(_job.Id, Request("Stale title", 1), _employer.Id, CancellationToken.None));

        await _jobs.SetJobActiveAsync(_job.Id, false, _employer.Id, CancellationToken.None);
        await Assert.ThrowsAsync<NotFoundException>(() => _jobs.GetPublicJobAsync(_job.Id, CancellationToken.None));
    }

    private static CreateJobPostRequest Request(string title, int version) =>
        new(title, "Front desk", "Corner Shop", "Bandra", "Maharashtra", "400050", Version: version);

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }
}
