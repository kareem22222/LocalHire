using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Npgsql;

namespace LocalHire.Api.Services;

public sealed class AuthService : IAuthService
{
    private readonly LocalHireDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IMemoryCache _cache;

    public AuthService(LocalHireDbContext db, ITokenService tokenService, IMemoryCache cache)
    {
        _db = db;
        _tokenService = tokenService;
        _cache = cache;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        var emailNormalized = request.Email.ToLowerInvariant();
        var role = Enum.Parse<UserRole>(request.Role);

        var exists = await _db.Users.AnyAsync(u => u.Email == emailNormalized && u.Role == role, ct);
        if (exists)
            throw new ConflictException("A user with this email and role already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Email = emailNormalized,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12),
            Role = role,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.Users.Add(user);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception) when (IsDuplicateUserViolation(exception))
        {
            _db.Entry(user).State = EntityState.Detached;
            throw new ConflictException("A user with this email and role already exists.");
        }

        var token = _tokenService.GenerateToken(user);
        return new AuthResponse(token);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var emailNormalized = request.Email.ToLowerInvariant();
        var role = Enum.Parse<UserRole>(request.Role);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == emailNormalized && u.Role == role, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email, password, or role.");

        var token = _tokenService.GenerateToken(user);
        return new AuthResponse(token);
    }

    public async Task<UserProfile> GetProfileAsync(Guid userId, CancellationToken ct)
    {
        var cacheKey = $"user_profile_{userId}";

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

        _cache.Remove($"user_profile_{userId}");

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

        _cache.Remove($"user_profile_{userId}");

        return ToProfile(user);
    }

    private static UserProfile ToProfile(User user) =>
        new(user.Id, user.Name, user.Email, user.Role,
            user.Phone, user.DateOfBirth, user.Gender, user.AddressLine,
            user.CityArea, user.State, user.Pincode,
            user.Latitude, user.Longitude, user.LocationUpdatedAt, user.CreatedAt);

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static bool IsDuplicateUserViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
        };
    }
}
