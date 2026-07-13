using System.Security.Claims;
using FluentValidation;
using LocalHire.Api.DTOs;
using LocalHire.Api.Services;
using LocalHire.Api.Utilities;

namespace LocalHire.Api.Endpoints;

/// <summary>
/// HTTP surface for hiring/worker job flows. These handlers only deal with HTTP
/// concerns — authorization, request validation, and mapping results to status
/// codes — and delegate all data access and business rules to <see cref="IJobService"/>.
/// </summary>
public static class JobEndpoints
{
    public static void MapJobEndpoints(this WebApplication app)
    {
        var hiringGroup = app.MapGroup("/api/hiring")
            .WithTags("Hiring")
            .RequireAuthorization()
            .RequireAuthorization("HiringOnly");

        var workGroup = app.MapGroup("/api/work")
            .WithTags("Work")
            .RequireAuthorization()
            .RequireAuthorization("LookingForWorkOnly");

        // --- Hiring endpoints ---

        hiringGroup.MapPost("/jobs", async (
            CreateJobPostRequest request,
            IValidator<CreateJobPostRequest> validator,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToValidationErrors());

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var response = await jobService.CreateJobAsync(request, userId, ct);
            return Results.Created($"/api/hiring/jobs/{response.Id}", response);
        })
        .WithName("CreateJobPost");

        hiringGroup.MapGet("/jobs", async (
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var jobs = await jobService.GetJobsForEmployerAsync(userId, ct);
            return Results.Ok(jobs);
        })
        .WithName("GetMyJobPosts");

        hiringGroup.MapGet("/jobs/{id:guid}", async (
            Guid id,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var job = await jobService.GetJobAsync(id, userId, ct);
            return Results.Ok(job);
        })
        .WithName("GetJobPost");

        hiringGroup.MapPut("/jobs/{id:guid}", async (
            Guid id,
            CreateJobPostRequest request,
            IValidator<CreateJobPostRequest> validator,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
                return Results.ValidationProblem(validation.ToValidationErrors());

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var job = await jobService.UpdateJobAsync(id, request, userId, ct);
            return Results.Ok(job);
        })
        .WithName("UpdateJobPost");

        hiringGroup.MapGet("/jobs/{id:guid}/applications", async (
            Guid id,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var applications = await jobService.GetApplicationsAsync(id, userId, ct);
            return Results.Ok(applications);
        })
        .WithName("GetJobApplications");

        // --- Worker endpoints ---

        workGroup.MapGet("/jobs/nearby", async (
            double? lat,
            double? lng,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (lat.HasValue != lng.HasValue)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["coordinates"] = new[] { "Latitude and longitude are required together." }
                });
            }

            if (lat is not null && lng is not null && !GeoCalculator.IsValidCoordinates(lat.Value, lng.Value))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["coordinates"] = new[] { "Latitude must be between -90 and 90, and longitude must be between -180 and 180." }
                });
            }

            var jobs = await jobService.GetNearbyJobsAsync(lat, lng, ct);
            return Results.Ok(jobs);
        })
        .WithName("GetNearbyJobs");

        workGroup.MapPost("/jobs/{id:guid}/apply", async (
            Guid id,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var application = await jobService.ApplyAsync(id, userId, ct);
            return Results.Created("/api/work/applications", application);
        })
        .WithName("ApplyToJob");

        workGroup.MapGet("/applications", async (
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var applications = await jobService.GetMyApplicationsAsync(userId, ct);
            return Results.Ok(applications);
        })
        .WithName("GetMyApplications");
    }
}
