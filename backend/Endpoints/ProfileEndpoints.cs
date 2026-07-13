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
            IProfileService profileService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToValidationErrors());
            }

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var profile = await profileService.UpdateProfileAsync(userId, request, ct);
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
            IProfileService profileService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToValidationErrors());
            }

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var profile = await profileService.UpdateLocationAsync(userId, request, ct);
            return Results.Ok(profile);
        })
        .WithName("UpdateLocation");
    }
}
