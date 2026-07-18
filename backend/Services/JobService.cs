using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using LocalHire.Api.Utilities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LocalHire.Api.Services;

public sealed class JobService : IJobService
{
    private const double NearbyRadiusKm = 50;
    private const string JobPostNotFoundMessage = "Job post not found.";

    private readonly LocalHireDbContext _db;

    public JobService(LocalHireDbContext db)
    {
        _db = db;
    }

    public async Task<JobPostResponse> CreateJobAsync(CreateJobPostRequest request, Guid employerId, CancellationToken ct)
    {
        var jobPost = JobMapper.CreateFrom(request, employerId);

        _db.JobPosts.Add(jobPost);
        await _db.SaveChangesAsync(ct);

        return JobMapper.ToResponse(jobPost, 0);
    }

    public async Task<IReadOnlyList<JobPostResponse>> GetJobsForEmployerAsync(Guid employerId, CancellationToken ct)
    {
        var jobs = await _db.JobPosts
            .Where(j => j.EmployerId == employerId)
            .Select(j => new
            {
                Job = j,
                Count = j.Applications.Count,
                Shortlisted = j.Applications.Count(a => a.Status == ApplicationStatus.Shortlisted)
            })
            .ToListAsync(ct);

        return jobs
            .OrderByDescending(x => x.Job.CreatedAt)
            .Select(x => JobMapper.ToResponse(x.Job, x.Count, x.Shortlisted))
            .ToList();
    }

    public async Task<JobPostResponse> GetJobAsync(Guid id, Guid employerId, CancellationToken ct)
    {
        var result = await _db.JobPosts
            .Where(j => j.Id == id && j.EmployerId == employerId)
            .Select(j => new
            {
                Job = j,
                Count = j.Applications.Count,
                Shortlisted = j.Applications.Count(a => a.Status == ApplicationStatus.Shortlisted)
            })
            .FirstOrDefaultAsync(ct);

        if (result is null)
            throw new NotFoundException(JobPostNotFoundMessage);

        return JobMapper.ToResponse(result.Job, result.Count, result.Shortlisted);
    }

    public async Task<JobPostResponse> UpdateJobAsync(Guid id, CreateJobPostRequest request, Guid employerId, CancellationToken ct)
    {
        var jobPost = await _db.JobPosts.FirstOrDefaultAsync(j => j.Id == id && j.EmployerId == employerId, ct);
        if (jobPost is null)
            throw new NotFoundException(JobPostNotFoundMessage);

        JobMapper.ApplyRequest(jobPost, request);

        await _db.SaveChangesAsync(ct);

        var count = await _db.JobApplications.CountAsync(a => a.JobPostId == id, ct);
        var shortlisted = await _db.JobApplications
            .CountAsync(a => a.JobPostId == id && a.Status == ApplicationStatus.Shortlisted, ct);
        return JobMapper.ToResponse(jobPost, count, shortlisted);
    }

    public async Task<IReadOnlyList<ApplicantResponse>> GetApplicationsAsync(Guid jobId, Guid employerId, CancellationToken ct)
    {
        var jobPost = await _db.JobPosts.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId, ct);
        if (jobPost is null)
            throw new NotFoundException(JobPostNotFoundMessage);

        var applications = await _db.JobApplications
            .Where(a => a.JobPostId == jobId)
            .Select(a => new ApplicantResponse(
                a.Id,
                a.WorkerId,
                a.Worker.Name,
                a.Worker.JobTitle,
                a.Worker.CityArea,
                a.Worker.State,
                a.Worker.Pincode,
                a.Status.ToString(),
                a.CreatedAt))
            .ToListAsync(ct);

        return applications.OrderByDescending(a => a.AppliedAt).ToList();
    }

    public async Task<ApplicantResponse> ShortlistApplicantAsync(Guid jobId, Guid applicationId, Guid employerId, CancellationToken ct)
    {
        var jobPost = await _db.JobPosts.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId, ct);
        if (jobPost is null)
            throw new NotFoundException(JobPostNotFoundMessage);

        var application = await _db.JobApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.JobPostId == jobId, ct);
        if (application is null)
            throw new NotFoundException("Application not found.");

        if (application.Status != ApplicationStatus.Shortlisted)
        {
            application.Status = ApplicationStatus.Shortlisted;
            await _db.SaveChangesAsync(ct);
        }

        var worker = await _db.Users.FirstAsync(u => u.Id == application.WorkerId, ct);

        return new ApplicantResponse(
            application.Id,
            worker.Id,
            worker.Name,
            worker.JobTitle,
            worker.CityArea,
            worker.State,
            worker.Pincode,
            application.Status.ToString(),
            application.CreatedAt);
    }

    public async Task<CandidateDetailResponse> GetCandidateDetailAsync(Guid workerId, CancellationToken ct)
    {
        var worker = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == workerId && u.Role == UserRole.LookingForWork, ct);
        if (worker is null)
            throw new NotFoundException("Candidate not found.");

        return new CandidateDetailResponse(
            worker.Id,
            worker.Name,
            worker.Email,
            worker.JobTitle,
            worker.Gender,
            worker.DateOfBirth,
            worker.AddressLine,
            worker.CityArea,
            worker.State,
            worker.Pincode,
            worker.Latitude,
            worker.Longitude,
            worker.CreatedAt,
            worker.ProfessionalSummary,
            worker.ExperienceYears,
            worker.Education,
            worker.Skills,
            worker.Languages,
            worker.ResumeKey is not null);
    }

    public async Task<IReadOnlyList<JobPostResponse>> GetNearbyJobsAsync(double? lat, double? lng, CancellationToken ct)
    {
        var query = _db.JobPosts.Where(j => j.IsActive);

        if (lat is not null && lng is not null)
        {
            var box = GeoCalculator.GetBoundingBox(lat.Value, lng.Value, NearbyRadiusKm);

            var nearbyQuery = query
                .Where(j => j.Latitude != null && j.Longitude != null)
                .Where(j => j.Latitude >= box.MinLat && j.Latitude <= box.MaxLat);

            if (!box.CoversAllLongitudes)
            {
                if (box.MinLng < -180)
                    nearbyQuery = nearbyQuery.Where(j => j.Longitude >= box.MinLng + 360 || j.Longitude <= box.MaxLng);
                else if (box.MaxLng > 180)
                    nearbyQuery = nearbyQuery.Where(j => j.Longitude >= box.MinLng || j.Longitude <= box.MaxLng - 360);
                else
                    nearbyQuery = nearbyQuery.Where(j => j.Longitude >= box.MinLng && j.Longitude <= box.MaxLng);
            }

            var jobs = await nearbyQuery
                .Select(j => new { Job = j, Count = j.Applications.Count })
                .ToListAsync(ct);

            return jobs
                .Select(x => new
                {
                    x.Job,
                    x.Count,
                    Distance = GeoCalculator.HaversineDistance(lat.Value, lng.Value, x.Job.Latitude, x.Job.Longitude)
                })
                .Where(x => x.Distance <= NearbyRadiusKm)
                .OrderBy(x => x.Distance)
                .Select(x => JobMapper.ToResponse(x.Job, x.Count))
                .ToList();
        }

        var allJobs = await query
            .Select(j => new { Job = j, Count = j.Applications.Count })
            .ToListAsync(ct);

        return allJobs
            .OrderByDescending(x => x.Job.CreatedAt)
            .Select(x => JobMapper.ToResponse(x.Job, x.Count))
            .ToList();
    }

    public async Task<IReadOnlyList<CandidateResponse>> GetNearbyCandidatesAsync(
        double? lat, double? lng, string? search, string? role, Guid employerId, CancellationToken ct)
    {
        var term = search?.Trim();
        var hasSearch = !string.IsNullOrEmpty(term);

        var query = ApplyCandidateFilters(
            _db.Users.Where(u => u.Role == UserRole.LookingForWork), term, role);

        // With coordinates and NO typed search term this is the "talent near your
        // business" default, so results are restricted to the local radius. A typed
        // search term is an explicit, location-independent request (e.g. a pincode
        // or city in another state), so it must NOT be constrained by the radius —
        // matches anywhere should surface (ordered by proximity further below).
        if (lat is not null && lng is not null && !hasSearch)
        {
            return await GetCandidatesWithinRadiusAsync(query, lat.Value, lng.Value, ct);
        }

        // No typed search term and no coordinates: default the list to workers in
        // the employer's own state so the results stay locally relevant.
        if (!hasSearch)
        {
            query = await ApplyEmployerStateDefaultAsync(query, employerId, ct);
        }

        // Reaches here for a global search (typed term, with or without
        // coordinates) or the state-default fallback. Cap the fetch, then rank by
        // proximity when we have an origin so the nearest matches come first while
        // still surfacing matches that lie outside the local radius. Ordering by
        // CreatedAt is done in memory because SQLite cannot ORDER BY a
        // DateTimeOffset (Postgres handles it either way).
        var matchedWorkers = await query
            .Take(200)
            .ToListAsync(ct);

        return RankCandidates(
            matchedWorkers.OrderByDescending(u => u.CreatedAt).ToList(), lat, lng);
    }

    /// <summary>
    /// Applies the optional case-insensitive text search (name, role, area, state,
    /// or pincode) and the optional exact role filter. Uses <c>LOWER(..) LIKE</c>
    /// (via <see cref="string.Contains(string)"/>) rather than a Postgres-only
    /// operator so the same query runs on every provider.
    /// </summary>
    private static IQueryable<Models.User> ApplyCandidateFilters(
        IQueryable<Models.User> query, string? term, string? role)
    {
        if (!string.IsNullOrEmpty(term))
        {
            var needle = term.ToLower();
#pragma warning disable CA1862 // EF Core cannot translate StringComparison overloads to SQL.
            query = query.Where(u =>
                u.Name.ToLower().Contains(needle) ||
                (u.JobTitle != null && u.JobTitle.ToLower().Contains(needle)) ||
                (u.CityArea != null && u.CityArea.ToLower().Contains(needle)) ||
                (u.State != null && u.State.ToLower().Contains(needle)) ||
                (u.Pincode != null && u.Pincode.ToLower().Contains(needle)));
#pragma warning restore CA1862
        }

        var roleFilter = role?.Trim();
        if (!string.IsNullOrEmpty(roleFilter))
        {
            query = query.Where(u => u.JobTitle != null && u.JobTitle == roleFilter);
        }

        return query;
    }

    /// <summary>
    /// Restricts <paramref name="query"/> to workers within
    /// <see cref="NearbyRadiusKm"/> of the origin, ordered nearest first. A cheap
    /// bounding-box pre-filter runs in SQL before the exact great-circle check.
    /// </summary>
    private static async Task<IReadOnlyList<CandidateResponse>> GetCandidatesWithinRadiusAsync(
        IQueryable<Models.User> query, double lat, double lng, CancellationToken ct)
    {
        var workers = await ApplyBoundingBox(query, lat, lng).ToListAsync(ct);

        return workers
            .Select(u => new
            {
                User = u,
                Distance = GeoCalculator.HaversineDistance(lat, lng, u.Latitude, u.Longitude)
            })
            .Where(x => x.Distance <= NearbyRadiusKm)
            .OrderBy(x => x.Distance)
            .Take(60)
            .Select(x => ToCandidateResponse(x.User, x.Distance))
            .ToList();
    }

    /// <summary>
    /// Narrows <paramref name="query"/> with the axis-aligned longitude/latitude
    /// window for the search radius, handling the antimeridian wrap and the pole
    /// case where every longitude is covered.
    /// </summary>
    private static IQueryable<Models.User> ApplyBoundingBox(
        IQueryable<Models.User> query, double lat, double lng)
    {
        var box = GeoCalculator.GetBoundingBox(lat, lng, NearbyRadiusKm);

        var nearbyQuery = query
            .Where(u => u.Latitude != null && u.Longitude != null)
            .Where(u => u.Latitude >= box.MinLat && u.Latitude <= box.MaxLat);

        if (box.CoversAllLongitudes)
            return nearbyQuery;

        if (box.MinLng < -180)
            return nearbyQuery.Where(u => u.Longitude >= box.MinLng + 360 || u.Longitude <= box.MaxLng);
        if (box.MaxLng > 180)
            return nearbyQuery.Where(u => u.Longitude >= box.MinLng || u.Longitude <= box.MaxLng - 360);
        return nearbyQuery.Where(u => u.Longitude >= box.MinLng && u.Longitude <= box.MaxLng);
    }

    /// <summary>
    /// When the employer has a state on file, restricts <paramref name="query"/>
    /// to workers in that same state; otherwise returns it unchanged.
    /// </summary>
    private async Task<IQueryable<Models.User>> ApplyEmployerStateDefaultAsync(
        IQueryable<Models.User> query, Guid employerId, CancellationToken ct)
    {
        var employerState = await _db.Users
            .Where(u => u.Id == employerId)
            .Select(u => u.State)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(employerState)
            ? query
            : query.Where(u => u.State != null && u.State == employerState);
    }

    /// <summary>
    /// Maps already-materialized workers to candidate DTOs. With an origin the list
    /// is ordered by proximity (nearest first); workers without coordinates keep a
    /// null distance and sort last.
    /// </summary>
    private static List<CandidateResponse> RankCandidates(
        IReadOnlyList<Models.User> workers, double? lat, double? lng)
    {
        if (lat is null || lng is null)
        {
            return workers
                .Take(60)
                .Select(u => ToCandidateResponse(u, null))
                .ToList();
        }

        return workers
            .Select(u => new
            {
                User = u,
                Distance = GeoCalculator.HaversineDistance(lat.Value, lng.Value, u.Latitude, u.Longitude)
            })
            .OrderBy(x => x.Distance)
            .Take(60)
            .Select(x => ToCandidateResponse(
                x.User, x.Distance >= double.MaxValue ? null : x.Distance))
            .ToList();
    }

    /// <summary>
    /// Maps a worker to a candidate DTO. When a distance is known the match score
    /// rewards proximity (100 at the door, easing down across the search radius);
    /// otherwise a neutral baseline is used so location-less results still rank.
    /// </summary>
    private static CandidateResponse ToCandidateResponse(Models.User worker, double? distanceKm)
    {
        int matchScore;
        if (distanceKm is not null && distanceKm.Value < double.MaxValue)
        {
            var proximity = 1 - Math.Min(distanceKm.Value, NearbyRadiusKm) / NearbyRadiusKm;
            matchScore = (int)Math.Round(60 + proximity * 39); // 60..99
        }
        else
        {
            matchScore = 70;
        }

        return new CandidateResponse(
            worker.Id,
            worker.Name,
            worker.JobTitle,
            worker.CityArea,
            worker.State,
            worker.Pincode,
            worker.Latitude,
            worker.Longitude,
            distanceKm is null || distanceKm.Value >= double.MaxValue
                ? null
                : Math.Round(distanceKm.Value, 1),
            matchScore);
    }

    public async Task<JobApplicationResponse> ApplyAsync(Guid jobId, Guid workerId, CancellationToken ct)
    {
        var jobPost = await _db.JobPosts.FirstOrDefaultAsync(j => j.Id == jobId && j.IsActive, ct)
            ?? throw new NotFoundException("Job post not found or no longer active.");

        var existing = await _db.JobApplications
            .AnyAsync(a => a.JobPostId == jobId && a.WorkerId == workerId, ct);
        if (existing)
            throw new ConflictException("You have already applied to this job.");

        var application = new JobApplication
        {
            Id = Guid.NewGuid(),
            JobPostId = jobId,
            WorkerId = workerId,
            Status = ApplicationStatus.Applied,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.JobApplications.Add(application);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException pgEx &&
            pgEx.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new ConflictException("You have already applied to this job.");
        }

        return new JobApplicationResponse(
            application.Id, application.JobPostId, jobPost.Title,
            jobPost.WorkplaceName, jobPost.CityArea,
            application.Status.ToString(), application.CreatedAt);
    }

    public async Task<IReadOnlyList<JobApplicationResponse>> GetMyApplicationsAsync(Guid workerId, CancellationToken ct)
    {
        var applications = await _db.JobApplications
            .Where(a => a.WorkerId == workerId)
            .Select(a => new JobApplicationResponse(
                a.Id, a.JobPostId, a.JobPost.Title,
                a.JobPost.WorkplaceName, a.JobPost.CityArea,
                a.Status.ToString(), a.CreatedAt))
            .ToListAsync(ct);

        return applications.OrderByDescending(a => a.CreatedAt).ToList();
    }
}
