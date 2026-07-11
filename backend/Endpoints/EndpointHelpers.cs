using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentValidation.Results;

namespace LocalHire.Api.Endpoints;

internal static class EndpointHelpers
{
    public static Dictionary<string, string[]> ToValidationErrors(this ValidationResult validation) =>
        validation.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

    public static bool TryGetUserId(this ClaimsPrincipal user, out Guid userId)
    {
        var claim = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out userId);
    }
}
