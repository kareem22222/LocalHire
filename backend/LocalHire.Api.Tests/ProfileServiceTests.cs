using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class ProfileServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly LocalHireDbContext _db;
    private readonly ProfileService _service;

    public ProfileServiceTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<LocalHireDbContext>()
            .UseSqlite(_connection)
            .Options;
        _db = new LocalHireDbContext(options);
        _db.Database.EnsureCreated();
        _service = new ProfileService(_db, new MemoryCache(new MemoryCacheOptions()));
    }

    private async Task<Guid> SeedUserAsync()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Asha",
            Email = "asha@example.com",
            PasswordHash = "hash",
            Role = UserRole.LookingForWork,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user.Id;
    }

    [Fact]
    public async Task GetProfile_throws_when_the_user_is_missing()
    {
        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.GetProfileAsync(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public async Task GetProfile_serves_the_second_read_from_cache()
    {
        var id = await SeedUserAsync();

        var first = await _service.GetProfileAsync(id, CancellationToken.None);
        // Remove the row; a cache hit must still return the profile.
        _db.Users.Remove(await _db.Users.FindAsync(id) ?? throw new InvalidOperationException());
        await _db.SaveChangesAsync();

        var second = await _service.GetProfileAsync(id, CancellationToken.None);
        Assert.Equal(first.Name, second.Name);
    }

    [Fact]
    public async Task UpdateProfile_throws_when_the_user_is_missing()
    {
        var request = new UpdateProfileRequest("Asha", null, null, null, null, null, null, null);
        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.UpdateProfileAsync(Guid.NewGuid(), request, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateProfile_persists_and_invalidates_the_cache()
    {
        var id = await SeedUserAsync();
        await _service.GetProfileAsync(id, CancellationToken.None); // prime cache

        var request = new UpdateProfileRequest("Asha Rao", "+91 90000 00000", null, null, null, "Indiranagar", "Karnataka", "560038");
        var updated = await _service.UpdateProfileAsync(id, request, CancellationToken.None);

        Assert.Equal("Asha Rao", updated.Name);
        var reread = await _service.GetProfileAsync(id, CancellationToken.None);
        Assert.Equal("Indiranagar", reread.CityArea);
    }

    [Fact]
    public async Task Worker_profile_completion_requires_employability_fields_but_not_a_resume()
    {
        var id = await SeedUserAsync();
        var request = new UpdateProfileRequest(
            "Asha Rao", "+91 90000 00000", null, null, null, "Indiranagar", "Karnataka", "560038",
            "Cashier", null, 0, "12th pass", ["Billing"], ["Hindi"]);

        var updated = await _service.UpdateProfileAsync(id, request, CancellationToken.None);

        Assert.True(updated.IsProfileComplete);
        Assert.Null(updated.ResumeFileName);
    }

    [Fact]
    public async Task Worker_profile_persists_practical_job_readiness_details()
    {
        var id = await SeedUserAsync();
        var request = new UpdateProfileRequest(
            "Asha Rao", "+91 90000 00000", null, null, null, "Mysuru", "Karnataka", "570001",
            "Electrician", "ITI-trained electrician available for local work.", 3, "ITI",
            WorkPreferences: new WorkerPreferences
            {
                DesiredRoles = ["Electrician"], EmploymentTypes = ["FullTime"], Shifts = ["Day"],
                ExpectedSalaryMin = 18000, SalaryPeriod = "Monthly", Availability = "Immediately",
                TravelRadiusKm = 20, OwnsVehicle = true, VehicleTypes = ["Two-wheeler"],
            },
            WorkHistory: [new WorkExperienceEntry { JobTitle = "Electrician", Employer = "Self-employed", IsCurrent = true }],
            EducationHistory: [new EducationEntry { Qualification = "ITI Electrician", Institution = "Government ITI" }],
            SkillDetails: [new SkillProfile { Name = "House wiring", Proficiency = "Advanced", YearsExperience = 3 }],
            LanguageDetails: [new LanguageProfile { Name = "Kannada", Proficiency = "Native", CanSpeak = true }],
            Credentials: [new CredentialEntry { Name = "Wireman certificate", Issuer = "State board" }]);

        var updated = await _service.UpdateProfileAsync(id, request, CancellationToken.None);

        Assert.Equal("Electrician", updated.WorkPreferences.DesiredRoles.Single());
        Assert.Equal("Self-employed", updated.WorkHistory.Single().Employer);
        Assert.Equal("House wiring", updated.Skills.Single());
        Assert.Equal(100, updated.ProfileCompletionPercent);
    }

    [Fact]
    public async Task UpdateLocation_rejects_missing_coordinates()
    {
        var id = await SeedUserAsync();
        await Assert.ThrowsAsync<BadRequestException>(
            () => _service.UpdateLocationAsync(id, new UpdateLocationRequest(null, 0), CancellationToken.None));
    }

    [Fact]
    public async Task UpdateLocation_rejects_out_of_range_coordinates()
    {
        var id = await SeedUserAsync();
        await Assert.ThrowsAsync<BadRequestException>(
            () => _service.UpdateLocationAsync(id, new UpdateLocationRequest(91, 0), CancellationToken.None));
    }

    [Fact]
    public async Task UpdateLocation_throws_when_the_user_is_missing()
    {
        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.UpdateLocationAsync(Guid.NewGuid(), new UpdateLocationRequest(10, 20), CancellationToken.None));
    }

    [Fact]
    public async Task UpdateLocation_rounds_and_persists_valid_coordinates()
    {
        var id = await SeedUserAsync();
        var updated = await _service.UpdateLocationAsync(id, new UpdateLocationRequest(12.34567, 77.65432), CancellationToken.None);

        Assert.Equal(12.346, updated.Latitude);
        Assert.Equal(77.654, updated.Longitude);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
