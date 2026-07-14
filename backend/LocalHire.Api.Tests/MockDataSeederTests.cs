using LocalHire.Api.Data;
using LocalHire.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class MockDataSeederTests
{
    [Fact]
    public async Task Bulk_seed_replaces_stale_mock_data_and_is_idempotent()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<LocalHireDbContext>()
            .UseSqlite(connection)
            .Options;
        await using var database = new LocalHireDbContext(options);
        await database.Database.EnsureCreatedAsync();

        database.Users.Add(new User
        {
            Id = new Guid("e0000000-0000-0000-0000-000000000031"),
            Name = "Legacy Mock Employer",
            Email = "employer049@localhire.test",
            PasswordHash = "unused",
            Role = UserRole.Hiring,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await database.SaveChangesAsync();
        database.ChangeTracker.Clear();

        await MockDataSeeder.SeedAsync(database);
        await MockDataSeeder.SeedAsync(database);

        Assert.Equal(15, await database.Users.CountAsync(user => user.Role == UserRole.Hiring));
        Assert.Equal(35, await database.Users.CountAsync(user => user.Role == UserRole.LookingForWork));
        Assert.Equal(1_000, await database.JobPosts.CountAsync());
        Assert.Equal(10_000, await database.JobApplications.CountAsync());

        var demoUsers = await database.Users
            .Where(user => user.Email == MockDataSeeder.DemoEmail)
            .ToListAsync();
        Assert.Equal(2, demoUsers.Count);
        Assert.Contains(demoUsers, user => user.Role == UserRole.Hiring);
        Assert.Contains(demoUsers, user => user.Role == UserRole.LookingForWork);
        Assert.All(demoUsers, user =>
            Assert.True(BCrypt.Net.BCrypt.Verify(MockDataSeeder.DemoPassword, user.PasswordHash)));

        var workerHash = await database.Users
            .Where(user => user.Email == "worker0001@localhire.test")
            .Select(user => user.PasswordHash)
            .SingleAsync();
        Assert.True(BCrypt.Net.BCrypt.Verify(MockDataSeeder.DemoPassword, workerHash));
    }
}
