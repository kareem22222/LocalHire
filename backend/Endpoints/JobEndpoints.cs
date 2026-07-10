using System.Globalization;
using System.Security.Claims;
using FluentValidation;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LocalHire.Api.Endpoints;

public static class JobEndpoints
{
    private const double NearbyRadiusKm = 50;

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
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToValidationErrors());
            }

            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var jobPost = new JobPost
            {
                Id = Guid.NewGuid(),
                EmployerId = userId,
                Title = request.Title.Trim(),
                Description = request.Description.Trim(),
                WorkplaceName = request.WorkplaceName.Trim(),
                CityArea = request.CityArea.Trim(),
                State = NormalizeText(request.State),
                Pincode = NormalizeText(request.Pincode),
                Latitude = request.Latitude is not null ? Math.Round(request.Latitude.Value, 3) : null,
                Longitude = request.Longitude is not null ? Math.Round(request.Longitude.Value, 3) : null,
                EmploymentType = ParseEnum<EmploymentType>(request.EmploymentType),
                SalaryMin = request.SalaryMin,
                SalaryMax = request.SalaryMax,
                SalaryPeriod = ParseEnum<SalaryPeriod>(request.SalaryPeriod),
                MinEducation = NormalizeText(request.MinEducation),
                ExperienceMinYears = request.ExperienceMinYears,
                ExperienceMaxYears = request.ExperienceMaxYears,
                WorkingDays = NormalizeText(request.WorkingDays),
                ShiftStartTime = ParseTime(request.ShiftStartTime),
                ShiftEndTime = ParseTime(request.ShiftEndTime),
                Openings = request.Openings,
                RequiredSkills = NormalizeList(request.RequiredSkills),
                Languages = NormalizeList(request.Languages),
                Benefits = NormalizeList(request.Benefits),
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.JobPosts.Add(jobPost);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/hiring/jobs/{jobPost.Id}", ToResponse(jobPost, 0));
        })
        .WithName("CreateJobPost");

        hiringGroup.MapGet("/jobs", async (
            ClaimsPrincipal user,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var jobs = await db.JobPosts
                .Where(j => j.EmployerId == userId)
                .Select(j => new { Job = j, Count = j.Applications.Count })
                .ToListAsync(ct);

            return Results.Ok(jobs
                .OrderByDescending(x => x.Job.CreatedAt)
                .Select(x => ToResponse(x.Job, x.Count)));
        })
        .WithName("GetMyJobPosts");

        hiringGroup.MapGet("/jobs/{id:guid}/applications", async (
            Guid id,
            ClaimsPrincipal user,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var jobPost = await db.JobPosts.FirstOrDefaultAsync(j => j.Id == id && j.EmployerId == userId, ct);
            if (jobPost is null)
                throw new NotFoundException("Job post not found.");

            var applications = await db.JobApplications
                .Where(a => a.JobPostId == id)
                .Select(a => new ApplicantResponse(
                    a.Id, a.Worker.Name, a.Status.ToString(), a.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(applications.OrderByDescending(a => a.AppliedAt));
        })
        .WithName("GetJobApplications");

        // --- Worker endpoints ---

        workGroup.MapGet("/jobs/nearby", async (
            double? lat,
            double? lng,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            var query = db.JobPosts.Where(j => j.IsActive);

            if (lat.HasValue != lng.HasValue)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["coordinates"] = new[] { "Latitude and longitude are required together." }
                });
            }

            if (lat is not null && lng is not null)
            {
                if (!IsValidCoordinates(lat.Value, lng.Value))
                {
                    return Results.ValidationProblem(new Dictionary<string, string[]>
                    {
                        ["coordinates"] = new[] { "Latitude must be between -90 and 90, and longitude must be between -180 and 180." }
                    });
                }

                var latDelta = NearbyRadiusKm / 111.32;
                var minLat = Math.Max(-90, lat.Value - latDelta);
                var maxLat = Math.Min(90, lat.Value + latDelta);
                var cosLat = Math.Cos(lat.Value * Math.PI / 180);
                var lngDelta = Math.Abs(cosLat) < 0.000001 ? 180 : NearbyRadiusKm / (111.32 * Math.Abs(cosLat));
                var minLng = lng.Value - lngDelta;
                var maxLng = lng.Value + lngDelta;

                var nearbyQuery = query
                    .Where(j => j.Latitude != null && j.Longitude != null)
                    .Where(j => j.Latitude >= minLat && j.Latitude <= maxLat);

                nearbyQuery = lngDelta >= 180
                    ? nearbyQuery
                    : minLng < -180
                        ? nearbyQuery.Where(j => j.Longitude >= minLng + 360 || j.Longitude <= maxLng)
                        : maxLng > 180
                            ? nearbyQuery.Where(j => j.Longitude >= minLng || j.Longitude <= maxLng - 360)
                            : nearbyQuery.Where(j => j.Longitude >= minLng && j.Longitude <= maxLng);

                var jobs = await nearbyQuery
                    .Select(j => new { Job = j, Count = j.Applications.Count })
                    .ToListAsync(ct);

                var nearby = jobs
                    .Select(x => new
                    {
                        x.Job,
                        x.Count,
                        Distance = HaversineDistance(lat.Value, lng.Value, x.Job.Latitude, x.Job.Longitude)
                    })
                    .Where(x => x.Distance <= NearbyRadiusKm)
                    .OrderBy(x => x.Distance)
                    .Select(x => ToResponse(x.Job, x.Count))
                    .ToList();

                return Results.Ok(nearby);
            }

            var allJobs = await query
                .Select(j => new { Job = j, Count = j.Applications.Count })
                .ToListAsync(ct);

            return Results.Ok(allJobs
                .OrderByDescending(x => x.Job.CreatedAt)
                .Select(x => ToResponse(x.Job, x.Count)));
        })
        .WithName("GetNearbyJobs");

        workGroup.MapPost("/jobs/{id:guid}/apply", async (
            Guid id,
            ClaimsPrincipal user,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var jobPost = await db.JobPosts.FirstOrDefaultAsync(j => j.Id == id && j.IsActive, ct)
                ?? throw new NotFoundException("Job post not found or no longer active.");

            var existing = await db.JobApplications
                .AnyAsync(a => a.JobPostId == id && a.WorkerId == userId, ct);
            if (existing)
                throw new ConflictException("You have already applied to this job.");

            var application = new JobApplication
            {
                Id = Guid.NewGuid(),
                JobPostId = id,
                WorkerId = userId,
                Status = ApplicationStatus.Applied,
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.JobApplications.Add(application);
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (
                ex.InnerException is PostgresException pgEx &&
                pgEx.SqlState == PostgresErrorCodes.UniqueViolation)
            {
                throw new ConflictException("You have already applied to this job.");
            }

            return Results.Created($"/api/work/applications", new JobApplicationResponse(
                application.Id, application.JobPostId, jobPost.Title,
                jobPost.WorkplaceName, jobPost.CityArea,
                application.Status.ToString(), application.CreatedAt));
        })
        .WithName("ApplyToJob");

        workGroup.MapGet("/applications", async (
            ClaimsPrincipal user,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            if (!TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var applications = await db.JobApplications
                .Where(a => a.WorkerId == userId)
                .Select(a => new JobApplicationResponse(
                    a.Id, a.JobPostId, a.JobPost.Title,
                    a.JobPost.WorkplaceName, a.JobPost.CityArea,
                    a.Status.ToString(), a.CreatedAt))
                .ToListAsync(ct);

            return Results.Ok(applications.OrderByDescending(a => a.CreatedAt));
        })
        .WithName("GetMyApplications");
    }

    private static bool TryGetUserId(ClaimsPrincipal user, out Guid userId)
        => user.TryGetUserId(out userId);

    private static JobPostResponse ToResponse(JobPost j, int applicationCount) =>
        new(j.Id, j.Title, j.Description, j.WorkplaceName,
            j.CityArea, j.State, j.Pincode, j.Latitude, j.Longitude,
            j.EmploymentType?.ToString(), j.SalaryMin, j.SalaryMax, j.SalaryPeriod?.ToString(),
            j.MinEducation, j.ExperienceMinYears, j.ExperienceMaxYears,
            j.WorkingDays,
            j.ShiftStartTime?.ToString("HH\\:mm", CultureInfo.InvariantCulture), j.ShiftEndTime?.ToString("HH\\:mm", CultureInfo.InvariantCulture),
            j.Openings, j.RequiredSkills, j.Languages, j.Benefits,
            j.IsActive, j.CreatedAt, applicationCount);

    private static string? NormalizeText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static TEnum? ParseEnum<TEnum>(string? value) where TEnum : struct, Enum =>
        Enum.TryParse<TEnum>(value, out var parsed) ? parsed : null;

    private static TimeOnly? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var hm))
            return hm;
        if (TimeOnly.TryParseExact(value, "HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var hms))
            return hms;
        return null;
    }

    private static List<string> NormalizeList(List<string>? values) =>
        values is null
            ? new List<string>()
            : values
                .Select(v => v?.Trim())
                .Where(v => !string.IsNullOrEmpty(v))
                .Select(v => v!)
                .Distinct()
                .ToList();

    private static bool IsValidCoordinates(double lat, double lng) =>
        double.IsFinite(lat) && double.IsFinite(lng) &&
        lat is >= -90.0 and <= 90.0 &&
        lng is >= -180.0 and <= 180.0;

    private static double HaversineDistance(double lat1, double lon1, double? lat2, double? lon2)
    {
        if (lat2 is null || lon2 is null)
            return double.MaxValue;

        const double R = 6371;
        var dLat = (lat2.Value - lat1) * Math.PI / 180;
        var dLon = (lon2.Value - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2.Value * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }
}
