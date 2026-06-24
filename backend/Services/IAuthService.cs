using LocalHire.Api.DTOs;

namespace LocalHire.Api.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<UserProfile> GetProfileAsync(Guid userId, CancellationToken ct);
}
