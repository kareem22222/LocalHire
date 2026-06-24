using LocalHire.Api.Models;

namespace LocalHire.Api.Services;

public interface ITokenService
{
    string GenerateToken(User user);
}
