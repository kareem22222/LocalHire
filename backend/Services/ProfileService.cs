using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace LocalHire.Api.Services;

public sealed class ProfileService : IProfileService
{
    private readonly LocalHireDbContext _db;
    private readonly IMemoryCache _cache;

    public ProfileService(LocalHireDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<UserProfile> GetProfileAsync(Guid userId, CancellationToken ct)
    {
        var cacheKey = CacheKey(userId);

        if (_cache.TryGetValue(cacheKey, out UserProfile? cached))
            return cached!;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");

        var profile = ToProfile(user);

        _cache.Set(cacheKey, profile, TimeSpan.FromMinutes(5));

        return profile;
    }

    public async Task<ResumeFileReference> GetResumeAsync(Guid userId, CancellationToken ct)
    {
        var resume = await _db.Users
            .Where(user => user.Id == userId && user.Role == UserRole.LookingForWork)
            .Select(user => new { user.ResumeKey, user.ResumeFileName })
            .FirstOrDefaultAsync(ct);

        if (resume?.ResumeKey is null)
            throw new NotFoundException("Resume not found.");

        return new ResumeFileReference(resume.ResumeKey, resume.ResumeFileName ?? "resume");
    }

    public async Task<UserProfile> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");

        user.Name = request.Name.Trim();
        user.Phone = NormalizeOptional(request.Phone);
        user.DateOfBirth = request.DateOfBirth;
        user.Gender = NormalizeOptional(request.Gender);
        user.AddressLine = NormalizeOptional(request.AddressLine);
        user.CityArea = NormalizeOptional(request.CityArea);
        user.State = NormalizeOptional(request.State);
        user.Pincode = NormalizeOptional(request.Pincode);
        if (user.Role == UserRole.LookingForWork)
        {
            user.JobTitle = NormalizeOptional(request.JobTitle);
            user.ProfessionalSummary = NormalizeOptional(request.ProfessionalSummary);
            user.ExperienceYears = request.ExperienceYears;
            user.Education = NormalizeOptional(request.Education);
            user.WorkPreferences = NormalizePreferences(request.WorkPreferences);
            user.WorkHistory = request.WorkHistory ?? [];
            user.EducationHistory = request.EducationHistory ?? [];
            user.SkillDetails = request.SkillDetails ?? [];
            user.LanguageDetails = request.LanguageDetails ?? [];
            user.Credentials = request.Credentials ?? [];
            user.Skills = NormalizeList(user.SkillDetails.Count > 0
                ? user.SkillDetails.Select(skill => skill.Name)
                : request.Skills);
            user.Languages = NormalizeList(user.LanguageDetails.Count > 0
                ? user.LanguageDetails.Select(language => language.Name)
                : request.Languages);
        }

        await _db.SaveChangesAsync(ct);

        _cache.Remove(CacheKey(userId));

        return ToProfile(user);
    }

    public async Task<UserProfile> UpdateLocationAsync(Guid userId, UpdateLocationRequest request, CancellationToken ct)
    {
        if (request is not { Latitude: double latitude, Longitude: double longitude })
            throw new BadRequestException("Latitude and longitude are required.");

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
            throw new BadRequestException("Latitude must be between -90 and 90, and longitude must be between -180 and 180.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");

        user.Latitude = Math.Round(latitude, 3);
        user.Longitude = Math.Round(longitude, 3);
        user.LocationUpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);

        _cache.Remove(CacheKey(userId));

        return ToProfile(user);
    }

    private static string CacheKey(Guid userId) => $"user_profile_{userId}";

    private static UserProfile ToProfile(User user) =>
        new(user.Id, user.Name, user.Email, user.Role,
            user.Phone, user.DateOfBirth, user.Gender, user.AddressLine,
            user.CityArea, user.State, user.Pincode,
            user.Latitude, user.Longitude, user.LocationUpdatedAt, user.CreatedAt,
            user.JobTitle, user.ProfessionalSummary, user.ExperienceYears, user.Education,
            user.Skills, user.Languages, user.WorkPreferences, user.WorkHistory,
            user.EducationHistory, user.SkillDetails, user.LanguageDetails, user.Credentials,
            user.ResumeFileName, IsComplete(user),
            CompletionPercent(user));

    private static bool IsComplete(User user) =>
        user.Role != UserRole.LookingForWork ||
        !string.IsNullOrWhiteSpace(user.Phone) &&
        !string.IsNullOrWhiteSpace(user.JobTitle) &&
        user.ExperienceYears is not null &&
        !string.IsNullOrWhiteSpace(user.Education) &&
        user.Languages.Count > 0 &&
        !string.IsNullOrWhiteSpace(user.CityArea) &&
        !string.IsNullOrWhiteSpace(user.State) &&
        !string.IsNullOrWhiteSpace(user.Pincode);

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<string> NormalizeList(IEnumerable<string>? values) =>
        values?.Select(NormalizeOptional).OfType<string>().Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? [];

    private static WorkerPreferences NormalizePreferences(WorkerPreferences? preferences)
    {
        preferences ??= new WorkerPreferences();
        preferences.DesiredRoles = NormalizeList(preferences.DesiredRoles);
        preferences.EmploymentTypes = NormalizeList(preferences.EmploymentTypes);
        preferences.Shifts = NormalizeList(preferences.Shifts);
        preferences.WorkModes = NormalizeList(preferences.WorkModes);
        preferences.PreferredLocations = NormalizeList(preferences.PreferredLocations);
        preferences.VehicleTypes = NormalizeList(preferences.VehicleTypes);
        preferences.SalaryPeriod = NormalizeOptional(preferences.SalaryPeriod);
        preferences.Availability = NormalizeOptional(preferences.Availability);
        return preferences;
    }

    private static int CompletionPercent(User user)
    {
        var preferences = user.WorkPreferences;
        var checks = new[]
        {
            !string.IsNullOrWhiteSpace(user.Phone),
            !string.IsNullOrWhiteSpace(user.JobTitle),
            !string.IsNullOrWhiteSpace(user.ProfessionalSummary),
            user.ExperienceYears is not null || user.WorkHistory.Count > 0,
            user.WorkHistory.Count > 0,
            !string.IsNullOrWhiteSpace(user.Education) || user.EducationHistory.Count > 0,
            user.SkillDetails.Count > 0 || user.Skills.Count > 0,
            user.LanguageDetails.Count > 0 || user.Languages.Count > 0,
            preferences.DesiredRoles.Count > 0,
            preferences.EmploymentTypes.Count > 0,
            preferences.Shifts.Count > 0 || preferences.WorkModes.Count > 0,
            preferences.ExpectedSalaryMin is not null || preferences.ExpectedSalaryMax is not null,
            !string.IsNullOrWhiteSpace(preferences.Availability),
            preferences.TravelRadiusKm is not null || preferences.PreferredLocations.Count > 0,
            user.Credentials.Count > 0 || user.ResumeKey is not null,
            !string.IsNullOrWhiteSpace(user.CityArea) &&
                !string.IsNullOrWhiteSpace(user.State) &&
                !string.IsNullOrWhiteSpace(user.Pincode),
        };

        return (int)Math.Round(checks.Count(value => value) * 100d / checks.Length);
    }
}
