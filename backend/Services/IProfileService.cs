using LocalHire.Api.DTOs;

namespace LocalHire.Api.Services;

/// <summary>
/// Owns reading and mutating the current user's profile and location. Split from
/// <see cref="IAuthService"/> so authentication (register/login) and profile
/// management stay single-purpose (SRP) and callers depend only on the slice they
/// need (ISP).
/// </summary>
public interface IProfileService
{
    Task<UserProfile> GetProfileAsync(Guid userId, CancellationToken ct);
    Task<UserProfile> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct);
    Task<UserProfile> UpdateLocationAsync(Guid userId, UpdateLocationRequest request, CancellationToken ct);
}
