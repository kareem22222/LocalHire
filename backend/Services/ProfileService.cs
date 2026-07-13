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
            user.Latitude, user.Longitude, user.LocationUpdatedAt, user.CreatedAt);

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
