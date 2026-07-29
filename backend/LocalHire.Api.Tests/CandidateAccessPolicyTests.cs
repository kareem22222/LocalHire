using LocalHire.Api.Data;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class CandidateAccessPolicyTests
{
    [Fact]
    public async Task Only_the_employer_who_received_an_application_can_view_the_worker()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<LocalHireDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var db = new LocalHireDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var owner = User("owner", UserRole.Hiring);
        var other = User("other", UserRole.Hiring);
        var worker = User("worker", UserRole.LookingForWork);
        var job = new JobPost
        {
            Id = Guid.NewGuid(), EmployerId = owner.Id, Title = "Cashier",
            Description = "Front desk", WorkplaceName = "Corner Shop",
            CityArea = "Bandra", CreatedAt = DateTimeOffset.UtcNow,
        };
        db.AddRange(owner, other, worker, job, new JobApplication
        {
            Id = Guid.NewGuid(), JobPostId = job.Id, WorkerId = worker.Id,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        var policy = new CandidateAccessPolicy(db);

        Assert.True(await policy.CanViewAsync(owner.Id, worker.Id, CancellationToken.None));
        Assert.False(await policy.CanViewAsync(other.Id, worker.Id, CancellationToken.None));
    }

    private static User User(string name, UserRole role) => new()
    {
        Id = Guid.NewGuid(), Name = name, Email = $"{name}@example.com",
        PasswordHash = "hash", Role = role, CreatedAt = DateTimeOffset.UtcNow,
    };
}
