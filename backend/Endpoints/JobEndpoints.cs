using System.Security.Claims;
using Amazon.S3;
using FluentValidation;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using LocalHire.Api.Services;

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

        hiringGroup.MapGet("/jobs/paged", async (
            int? page,
            int? pageSize,
            string? status,
            bool? shortlistedOnly,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var pagingErrors = PagingRequest.Validate(page, pageSize, out var paging);
            if (pagingErrors.Count > 0)
                return Results.ValidationProblem(pagingErrors);

            var normalizedStatus = status?.Trim().ToLowerInvariant() ?? "all";
            if (normalizedStatus is not ("all" or "open" or "closed"))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["status"] = ["Status must be all, open, or closed."]
                });
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var statusFilter = normalizedStatus switch
            {
                "open" => JobStatusFilter.Open,
                "closed" => JobStatusFilter.Closed,
                _ => (JobStatusFilter?)null
            };
            return Results.Ok(await jobService.GetJobsForEmployerPagedAsync(
                userId, statusFilter, shortlistedOnly == true, paging, ct));
        })
        .WithName("GetMyJobPostsPaged");

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

        hiringGroup.MapGet("/jobs/{id:guid}/applications/paged", async (
            Guid id,
            int? page,
            int? pageSize,
            string? status,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var pagingErrors = PagingRequest.Validate(page, pageSize, out var paging);
            if (pagingErrors.Count > 0)
                return Results.ValidationProblem(pagingErrors);

            ApplicationStatus? parsedStatus = null;
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (!Enum.TryParse<ApplicationStatus>(status, true, out var value)
                    || !Enum.IsDefined(value))
                    return Results.ValidationProblem(new Dictionary<string, string[]>
                    {
                        ["status"] = ["Status is not a valid application status."]
                    });
                parsedStatus = value;
            }
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.GetApplicationsPagedAsync(
                id, userId, parsedStatus, paging, ct));
        })
        .WithName("GetJobApplicationsPaged");

        hiringGroup.MapPost("/jobs/{jobId:guid}/applications/{applicationId:guid}/shortlist", async (
            Guid jobId,
            Guid applicationId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var applicant = await jobService.ShortlistApplicantAsync(jobId, applicationId, userId, ct);
            return Results.Ok(applicant);
        })
        .WithName("ShortlistApplicant");

        hiringGroup.MapPost("/jobs/{jobId:guid}/applications/{applicationId:guid}/reject", async (
            Guid jobId,
            Guid applicationId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var applicant = await jobService.SetApplicationStatusAsync(
                jobId, applicationId, ApplicationStatus.Rejected, userId, ct);
            return Results.Ok(applicant);
        })
        .WithName("RejectApplicant")
        .Produces<ApplicantResponse>()
        .Produces(StatusCodes.Status403Forbidden)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status409Conflict);

        hiringGroup.MapPost("/jobs/{jobId:guid}/applications/{applicationId:guid}/hire", async (
            Guid jobId,
            Guid applicationId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var applicant = await jobService.SetApplicationStatusAsync(
                jobId, applicationId, ApplicationStatus.Hired, userId, ct);
            return Results.Ok(applicant);
        })
        .WithName("HireApplicant")
        .Produces<ApplicantResponse>()
        .Produces(StatusCodes.Status403Forbidden)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status409Conflict);

        hiringGroup.MapGet("/candidates/{id:guid}", async (
            Guid id,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var candidate = await jobService.GetCandidateDetailAsync(id, userId, ct);
            return Results.Ok(candidate);
        })
        .WithName("GetCandidateDetail");

        hiringGroup.MapGet("/candidates/{id:guid}/resume", async (
            Guid id,
            ClaimsPrincipal user,
            IJobService jobService,
            [FromKeyedServices("ResumeDownload")] IAmazonS3 s3,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var resume = await jobService.GetCandidateResumeAsync(id, userId, ct);
            var bucket = configuration["AWS:S3Bucket"];
            if (string.IsNullOrWhiteSpace(bucket))
                return Results.Problem("AWS:S3Bucket is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable);

            return Results.Ok(await EndpointHelpers.CreateResumeDownloadAsync(s3, bucket, resume));
        })
        .WithName("DownloadCandidateResume")
        .Produces<ResumeDownloadResponse>()
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound);

        hiringGroup.MapGet("/candidates/nearby", async (
            double? lat,
            double? lng,
            string? search,
            string? role,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var coordinateError = EndpointHelpers.ValidateCoordinatePair(lat, lng);
            if (coordinateError is not null)
                return coordinateError;

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var candidates = await jobService.GetNearbyCandidatesAsync(lat, lng, search, role, userId, ct);
            return Results.Ok(candidates);
        })
        .WithName("GetNearbyCandidates");

        hiringGroup.MapGet("/candidates/search", async (
            int? page,
            int? pageSize,
            double? lat,
            double? lng,
            string? search,
            string? role,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var pagingErrors = PagingRequest.Validate(page, pageSize, out var paging);
            if (pagingErrors.Count > 0)
                return Results.ValidationProblem(pagingErrors);
            var coordinateError = EndpointHelpers.ValidateCoordinatePair(lat, lng);
            if (coordinateError is not null)
                return coordinateError;
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.SearchCandidatesAsync(
                lat, lng, search, role, userId, paging, ct));
        })
        .WithName("SearchCandidates");

        hiringGroup.MapGet("/saved-candidates", async (
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.GetSavedCandidateIdsAsync(userId, ct));
        })
        .WithName("GetSavedCandidates");

        hiringGroup.MapGet("/saved-candidates/paged", async (
            int? page,
            int? pageSize,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var pagingErrors = PagingRequest.Validate(page, pageSize, out var paging);
            if (pagingErrors.Count > 0)
                return Results.ValidationProblem(pagingErrors);
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.GetSavedCandidatesPagedAsync(userId, paging, ct));
        })
        .WithName("GetSavedCandidatesPaged");

        hiringGroup.MapPost("/saved-candidates/{workerId:guid}", async (
            Guid workerId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            await jobService.SaveCandidateAsync(workerId, userId, ct);
            return Results.NoContent();
        })
        .WithName("SaveCandidate");

        hiringGroup.MapDelete("/saved-candidates/{workerId:guid}", async (
            Guid workerId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            await jobService.RemoveSavedCandidateAsync(workerId, userId, ct);
            return Results.NoContent();
        })
        .WithName("RemoveSavedCandidate");

        // --- Worker endpoints ---

        workGroup.MapGet("/jobs/nearby", async (
            double? lat,
            double? lng,
            string? search,
            EmploymentType? employmentType,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var coordinateError = EndpointHelpers.ValidateCoordinatePair(lat, lng);
            if (coordinateError is not null)
                return coordinateError;

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var jobs = await jobService.GetNearbyJobsAsync(
                lat, lng, search, employmentType, userId, ct);
            return Results.Ok(jobs);
        })
        .WithName("GetNearbyJobs");

        workGroup.MapGet("/jobs/search", async (
            int? page,
            int? pageSize,
            double? lat,
            double? lng,
            string? search,
            EmploymentType? employmentType,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var pagingErrors = PagingRequest.Validate(page, pageSize, out var paging);
            if (pagingErrors.Count > 0)
                return Results.ValidationProblem(pagingErrors);
            var coordinateError = EndpointHelpers.ValidateCoordinatePair(lat, lng);
            if (coordinateError is not null)
                return coordinateError;
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.SearchJobsAsync(
                lat, lng, search, employmentType, userId, paging, ct));
        })
        .WithName("SearchWorkerJobs");

        workGroup.MapGet("/jobs/{id:guid}", async (
            Guid id,
            IJobService jobService,
            CancellationToken ct) =>
            Results.Ok(await jobService.GetActiveJobAsync(id, ct)))
        .WithName("GetWorkerJob");

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

        workGroup.MapGet("/applications/paged", async (
            int? page,
            int? pageSize,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var pagingErrors = PagingRequest.Validate(page, pageSize, out var paging);
            if (pagingErrors.Count > 0)
                return Results.ValidationProblem(pagingErrors);
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.GetMyApplicationsPagedAsync(userId, paging, ct));
        })
        .WithName("GetMyApplicationsPaged");

        workGroup.MapGet("/saved-jobs", async (
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.GetSavedJobIdsAsync(userId, ct));
        })
        .WithName("GetSavedJobs");

        workGroup.MapGet("/saved-jobs/paged", async (
            int? page,
            int? pageSize,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var pagingErrors = PagingRequest.Validate(page, pageSize, out var paging);
            if (pagingErrors.Count > 0)
                return Results.ValidationProblem(pagingErrors);
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.GetSavedJobsPagedAsync(userId, paging, ct));
        })
        .WithName("GetSavedJobsPaged");

        workGroup.MapPost("/saved-jobs/{jobId:guid}", async (
            Guid jobId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            await jobService.SaveJobAsync(jobId, userId, ct);
            return Results.NoContent();
        })
        .WithName("SaveJob");

        workGroup.MapDelete("/saved-jobs/{jobId:guid}", async (
            Guid jobId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            await jobService.RemoveSavedJobAsync(jobId, userId, ct);
            return Results.NoContent();
        })
        .WithName("RemoveSavedJob");
    }
}
