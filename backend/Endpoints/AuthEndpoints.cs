using System.Security.Claims;
using FluentValidation;
using LocalHire.Api.DTOs;
using LocalHire.Api.Services;
using Microsoft.AspNetCore.RateLimiting;

namespace LocalHire.Api.Endpoints;

public static class AuthEndpoints
{
    public const string AnonymousAuthRateLimitPolicy = "anonymous-auth";

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (
            RegisterRequest request,
            IValidator<RegisterRequest> validator,
            IAuthService authService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToValidationErrors());
            }

            var result = await authService.RegisterAsync(request, ct);
            return Results.Created("/api/auth/me", result);
        })
        .WithName("Register")
        .Produces<AuthResponse>(StatusCodes.Status201Created)
        .ProducesValidationProblem()
        .RequireRateLimiting(AnonymousAuthRateLimitPolicy)
        .AllowAnonymous();

        group.MapPost("/login", async (
            LoginRequest request,
            IValidator<LoginRequest> validator,
            IAuthService authService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToValidationErrors());
            }

            var result = await authService.LoginAsync(request, ct);
            return Results.Ok(result);
        })
        .WithName("Login")
        .Produces<AuthResponse>(StatusCodes.Status200OK)
        .ProducesValidationProblem()
        .RequireRateLimiting(AnonymousAuthRateLimitPolicy)
        .AllowAnonymous();

        group.MapGet("/me", async (
            ClaimsPrincipal user,
            IProfileService profileService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var profile = await profileService.GetProfileAsync(userId, ct);
            return Results.Ok(profile);
        })
        .WithName("GetProfile")
        .Produces<UserProfile>()
        .Produces(StatusCodes.Status401Unauthorized)
        .RequireAuthorization();
    }
}
