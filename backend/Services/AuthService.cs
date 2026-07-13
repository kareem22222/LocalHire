using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LocalHire.Api.Services;

public sealed class AuthService : IAuthService
{
    private readonly LocalHireDbContext _db;
    private readonly ITokenService _tokenService;

    public AuthService(LocalHireDbContext db, ITokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
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

    private static bool IsDuplicateUserViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
        };
    }
}
