using System.Security.Claims;
using Amazon.S3;
using FluentValidation;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using System.Text;

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

        app.MapGet("/api/public/jobs/{id:guid}", async (
            Guid id,
            IJobService jobService,
            CancellationToken ct) => Results.Ok(await jobService.GetPublicJobAsync(id, ct)))
            .AllowAnonymous()
            .WithTags("Public")
            .WithName("GetPublicJob");

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

        hiringGroup.MapPatch("/jobs/{id:guid}/status", async (
            Guid id,
            UpdateJobStatusRequest request,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.SetJobActiveAsync(id, request.IsActive, userId, ct));
        })
        .WithName("SetJobStatus");

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

            return Results.Ok(await EndpointHelpers.CreateResumeDownloadAsync(
                s3, bucket, resume,
                configuration["AWS:PublicServiceUrl"] ?? configuration["AWS:ServiceUrl"]));
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

        hiringGroup.MapPost("/candidates/{workerId:guid}/invitations", async (
            Guid workerId,
            CreateInvitationRequest request,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();
            return Results.Ok(await jobService.CreateInvitationAsync(
                workerId, request.JobPostId, userId, ct));
        })
        .WithName("InviteCandidate");

        // --- Worker endpoints ---

        workGroup.MapGet("/jobs/nearby", async (
            double? lat,
            double? lng,
            string? search,
            EmploymentType? employmentType,
            decimal? salaryMin,
            decimal? salaryMax,
            SalaryPeriod? salaryPeriod,
            int? experienceYears,
            double? maxDistanceKm,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            var coordinateError = EndpointHelpers.ValidateCoordinatePair(lat, lng);
            if (coordinateError is not null)
                return coordinateError;
            var filterError = ValidateJobFilters(
                lat, lng, salaryMin, salaryMax, salaryPeriod, experienceYears, maxDistanceKm);
            if (filterError is not null)
                return filterError;

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var jobs = await jobService.GetNearbyJobsAsync(
                lat, lng, search, employmentType, salaryMin, salaryMax, salaryPeriod,
                experienceYears, maxDistanceKm, userId, ct);
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
            decimal? salaryMin,
            decimal? salaryMax,
            SalaryPeriod? salaryPeriod,
            int? experienceYears,
            double? maxDistanceKm,
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
            var filterError = ValidateJobFilters(
                lat, lng, salaryMin, salaryMax, salaryPeriod, experienceYears, maxDistanceKm);
            if (filterError is not null)
                return filterError;
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            return Results.Ok(await jobService.SearchJobsAsync(
                lat, lng, search, employmentType, salaryMin, salaryMax, salaryPeriod,
                experienceYears, maxDistanceKm, userId, paging, ct));
        })
        .WithName("SearchWorkerJobs");

        workGroup.MapGet("/jobs/{id:guid}", async (
            Guid id,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();
            return Results.Ok(await jobService.GetWorkerJobAsync(id, userId, ct));
        })
        .WithName("GetWorkerJob");

        workGroup.MapGet("/businesses/{employerId:guid}", async (
            Guid employerId,
            IJobService jobService,
            CancellationToken ct) =>
            Results.Ok(await jobService.GetBusinessProfileAsync(employerId, ct)))
        .WithName("GetBusinessProfile");

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

        workGroup.MapPost("/applications/{applicationId:guid}/withdraw", async (
            Guid applicationId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();
            return Results.Ok(await jobService.WithdrawApplicationAsync(applicationId, userId, ct));
        })
        .WithName("WithdrawApplication");

        workGroup.MapGet("/invitations", async (
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();
            return Results.Ok(await jobService.GetMyInvitationsAsync(userId, ct));
        })
        .WithName("GetMyInvitations");

        workGroup.MapPost("/invitations/{invitationId:guid}/decline", async (
            Guid invitationId,
            ClaimsPrincipal user,
            IJobService jobService,
            CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();
            return Results.Ok(await jobService.DeclineInvitationAsync(invitationId, userId, ct));
        })
        .WithName("DeclineInvitation");

        MapAppointmentEndpoints(hiringGroup, UserRole.Hiring);
        MapAppointmentEndpoints(workGroup, UserRole.LookingForWork);

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

    private static void MapAppointmentEndpoints(RouteGroupBuilder group, UserRole role)
    {
        group.MapGet("/applications/{applicationId:guid}/appointment", async (
            Guid applicationId, ClaimsPrincipal user, IJobService jobs, CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId)) return Results.Unauthorized();
            var appointment = await jobs.GetAppointmentAsync(applicationId, userId, role, ct);
            return appointment is null ? Results.NoContent() : Results.Ok(appointment);
        });

        group.MapPut("/applications/{applicationId:guid}/appointment", async (
            Guid applicationId, AppointmentRequest request, ClaimsPrincipal user,
            IJobService jobs, CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId)) return Results.Unauthorized();
            return Results.Ok(await jobs.SetAppointmentAsync(applicationId, request, userId, role, ct));
        });

        group.MapPost("/applications/{applicationId:guid}/appointment/confirm", async (
            Guid applicationId, ClaimsPrincipal user, IJobService jobs, CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId)) return Results.Unauthorized();
            return Results.Ok(await jobs.ConfirmAppointmentAsync(applicationId, userId, role, ct));
        });

        group.MapPost("/applications/{applicationId:guid}/appointment/cancel", async (
            Guid applicationId, ClaimsPrincipal user, IJobService jobs, CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId)) return Results.Unauthorized();
            return Results.Ok(await jobs.CancelAppointmentAsync(applicationId, userId, role, ct));
        });

        group.MapGet("/applications/{applicationId:guid}/appointment.ics", async (
            Guid applicationId, ClaimsPrincipal user, IJobService jobs, CancellationToken ct) =>
        {
            if (!user.TryGetUserId(out var userId)) return Results.Unauthorized();
            var appointment = await jobs.GetAppointmentAsync(applicationId, userId, role, ct);
            if (appointment is null || appointment.Status == "Cancelled") return Results.NotFound();
            var start = appointment.StartsAt.UtcDateTime;
            var calendar = $"BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LocalHire//Appointment//EN\r\nBEGIN:VEVENT\r\nUID:{appointment.Id}@localhire\r\nDTSTAMP:{DateTime.UtcNow:yyyyMMdd'T'HHmmss'Z'}\r\nDTSTART:{start:yyyyMMdd'T'HHmmss'Z'}\r\nSUMMARY:LocalHire interview or trial shift\r\nLOCATION:{EscapeCalendar(appointment.Venue)}\r\nDESCRIPTION:{EscapeCalendar(appointment.Notes ?? appointment.MeetingUrl)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
            return Results.File(Encoding.UTF8.GetBytes(calendar), "text/calendar", "localhire-appointment.ics");
        });
    }

    private static IResult? ValidateJobFilters(
        double? lat, double? lng, decimal? salaryMin, decimal? salaryMax,
        SalaryPeriod? salaryPeriod, int? experienceYears, double? maxDistanceKm)
    {
        var errors = new Dictionary<string, string[]>();
        if (salaryMin < 0) errors[nameof(salaryMin)] = ["Minimum salary cannot be negative."];
        if (salaryMax < 0) errors[nameof(salaryMax)] = ["Maximum salary cannot be negative."];
        if (salaryMin is not null && salaryMax is not null && salaryMax < salaryMin)
            errors[nameof(salaryMax)] = ["Maximum salary must be at least the minimum salary."];
        if ((salaryMin is not null || salaryMax is not null) && salaryPeriod is null)
            errors[nameof(salaryPeriod)] = ["Salary period is required when filtering by pay."];
        if (experienceYears is < 0 or > 60)
            errors[nameof(experienceYears)] = ["Experience must be between 0 and 60 years."];
        if (maxDistanceKm is < 1 or > 500)
            errors[nameof(maxDistanceKm)] = ["Distance must be between 1 and 500 km."];
        if (maxDistanceKm is not null && (lat is null || lng is null))
            errors[nameof(maxDistanceKm)] = ["Distance requires a location."];
        return errors.Count == 0 ? null : Results.ValidationProblem(errors);
    }

    private static string EscapeCalendar(string? value) =>
        (value ?? string.Empty).Replace("\\", "\\\\").Replace(";", "\\;").Replace(",", "\\,").Replace("\r", string.Empty).Replace("\n", "\\n");
}
