using System.Security.Claims;
using FluentValidation;
using LocalHire.Api.DTOs;
using LocalHire.Api.Services;

namespace LocalHire.Api.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/me")
            .WithTags("Profile")
            .RequireAuthorization();

        group.MapPut("/profile", async (
            UpdateProfileRequest request,
            IValidator<UpdateProfileRequest> validator,
            ClaimsPrincipal user,
            IAuthService authService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                var errors = validation.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                return Results.ValidationProblem(errors);
            }

            var userIdClaim = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
                ?? user.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim is null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Results.Unauthorized();

            var profile = await authService.UpdateProfileAsync(userId, request, ct);
            return Results.Ok(profile);
        })
        .WithName("UpdateProfile")
        .Produces<UserProfile>()
        .ProducesValidationProblem()
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPut("/location", async (
            UpdateLocationRequest request,
            IValidator<UpdateLocationRequest> validator,
            ClaimsPrincipal user,
            IAuthService authService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                var errors = validation.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                return Results.ValidationProblem(errors);
            }

            var userIdClaim = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
                ?? user.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim is null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Results.Unauthorized();

            var profile = await authService.UpdateLocationAsync(userId, request, ct);
            return Results.Ok(profile);
        })
        .WithName("UpdateLocation");
    }
}
