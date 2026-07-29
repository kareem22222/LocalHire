using LocalHire.Api.Data;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class ApplicationStatusTransitionTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly LocalHireDbContext _db;
    private readonly JobService _service;

    public ApplicationStatusTransitionTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        _db = new LocalHireDbContext(
            new DbContextOptionsBuilder<LocalHireDbContext>()
                .UseSqlite(_connection)
                .Options);
        _db.Database.EnsureCreated();
        _service = new JobService(
            _db,
            new CandidateAccessPolicy(_db),
            new NotificationService(_db));
    }

    [Theory]
    [InlineData(ApplicationStatus.Applied, ApplicationStatus.Shortlisted)]
    [InlineData(ApplicationStatus.Applied, ApplicationStatus.Rejected)]
    [InlineData(ApplicationStatus.Shortlisted, ApplicationStatus.Hired)]
    [InlineData(ApplicationStatus.Shortlisted, ApplicationStatus.Rejected)]
    public async Task Allows_each_legal_transition(
        ApplicationStatus current, ApplicationStatus target)
    {
        var (employerId, jobId, applicationId) = await SeedAsync(current);

        var result = await _service.SetApplicationStatusAsync(
            jobId, applicationId, target, employerId, CancellationToken.None);

        Assert.Equal(target.ToString(), result.Status);
        Assert.Equal(target, (await _db.JobApplications.FindAsync(applicationId))!.Status);
        Assert.Equal(target.ToString(), Assert.Single(await _db.Notifications.ToListAsync()).Type);
    }

    [Theory]
    [InlineData(ApplicationStatus.Applied, ApplicationStatus.Hired)]
    [InlineData(ApplicationStatus.Shortlisted, ApplicationStatus.Applied)]
    [InlineData(ApplicationStatus.Hired, ApplicationStatus.Rejected)]
    [InlineData(ApplicationStatus.Rejected, ApplicationStatus.Shortlisted)]
    public async Task Rejects_illegal_and_terminal_transitions(
        ApplicationStatus current, ApplicationStatus target)
    {
        var (employerId, jobId, applicationId) = await SeedAsync(current);

        await Assert.ThrowsAsync<ConflictException>(() =>
            _service.SetApplicationStatusAsync(
                jobId, applicationId, target, employerId, CancellationToken.None));

        Assert.Equal(current, (await _db.JobApplications.FindAsync(applicationId))!.Status);
        Assert.Empty(await _db.Notifications.ToListAsync());
    }

    private async Task<(Guid EmployerId, Guid JobId, Guid ApplicationId)> SeedAsync(
        ApplicationStatus status)
    {
        var employer = new User
        {
            Id = Guid.NewGuid(),
            Name = "Employer",
            Email = $"employer-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = UserRole.Hiring,
            CreatedAt = DateTimeOffset.UtcNow
        };
        var worker = new User
        {
            Id = Guid.NewGuid(),
            Name = "Worker",
            Email = $"worker-{Guid.NewGuid():N}@example.com",
            PasswordHash = "hash",
            Role = UserRole.LookingForWork,
            CreatedAt = DateTimeOffset.UtcNow
        };
        var job = new JobPost
        {
            Id = Guid.NewGuid(),
            EmployerId = employer.Id,
            Title = "Cashier",
            Description = "Front desk",
            WorkplaceName = "Corner Shop",
            CityArea = "Bandra",
            CreatedAt = DateTimeOffset.UtcNow
        };
        var application = new JobApplication
        {
            Id = Guid.NewGuid(),
            JobPostId = job.Id,
            WorkerId = worker.Id,
            Status = status,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.AddRange(employer, worker, job, application);
        await _db.SaveChangesAsync();
        return (employer.Id, job.Id, application.Id);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
