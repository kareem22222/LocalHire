using LocalHire.Api.DTOs;

namespace LocalHire.Api.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<UserProfile> GetProfileAsync(Guid userId, CancellationToken ct);
    Task<UserProfile> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct);
    Task<UserProfile> UpdateLocationAsync(Guid userId, UpdateLocationRequest request, CancellationToken ct);
}
