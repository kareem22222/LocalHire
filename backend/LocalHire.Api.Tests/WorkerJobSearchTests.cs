using LocalHire.Api.Data;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class WorkerJobSearchTests
{
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

        var service = new JobService(db, new CandidateAccessPolicy(db));
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
