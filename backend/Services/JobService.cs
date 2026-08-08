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
    private readonly ICandidateAccessPolicy _candidateAccess;
    private readonly INotificationService _notifications;

    public JobService(
        LocalHireDbContext db,
        ICandidateAccessPolicy candidateAccess,
        INotificationService notifications)
    {
        _db = db;
        _candidateAccess = candidateAccess;
        _notifications = notifications;
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

    public async Task<PagedResponse<JobPostResponse>> GetJobsForEmployerPagedAsync(
        Guid employerId, string status, bool shortlistedOnly, PagingRequest paging, CancellationToken ct)
    {
        var query = _db.JobPosts.Where(job => job.EmployerId == employerId);
        query = status switch
        {
            "open" => query.Where(job => job.IsActive),
            "closed" => query.Where(job => !job.IsActive),
            _ => query
        };
        if (shortlistedOnly)
            query = query.Where(job => job.Applications.Any(application =>
                application.Status == ApplicationStatus.Shortlisted));

        var totalCount = await query.CountAsync(ct);
        var projected = query.Select(job => new
        {
            Job = job,
            Count = job.Applications.Count,
            Shortlisted = job.Applications.Count(application =>
                application.Status == ApplicationStatus.Shortlisted)
        });
        var rows = IsSqlite
            ? (await projected.ToListAsync(ct))
                .OrderByDescending(item => item.Job.CreatedAt)
                .ThenBy(item => item.Job.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToList()
            : await projected
                .OrderByDescending(item => item.Job.CreatedAt)
                .ThenBy(item => item.Job.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToListAsync(ct);

        return PagedResponse<JobPostResponse>.Create(
            rows.Select(item => JobMapper.ToResponse(
                item.Job, item.Count, item.Shortlisted)).ToList(), paging, totalCount);
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

        _db.ChangeTracker.DetectChanges();
        if (_db.Entry(jobPost).State == EntityState.Modified)
        {
            var workerIds = await _db.JobApplications
                .Where(application => application.JobPostId == id)
                .Select(application => application.WorkerId)
                .Distinct()
                .ToListAsync(ct);
            _notifications.NotifyJobUpdated(workerIds, jobPost);
        }

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

    public async Task<PagedResponse<ApplicantResponse>> GetApplicationsPagedAsync(
        Guid jobId, Guid employerId, ApplicationStatus? status,
        PagingRequest paging, CancellationToken ct)
    {
        if (!await _db.JobPosts.AnyAsync(
                job => job.Id == jobId && job.EmployerId == employerId, ct))
            throw new NotFoundException(JobPostNotFoundMessage);

        var query = _db.JobApplications.Where(application => application.JobPostId == jobId);
        if (status is not null)
            query = query.Where(application => application.Status == status);

        var totalCount = await query.CountAsync(ct);
        var projected = query.Select(application => new ApplicantResponse(
            application.Id,
            application.WorkerId,
            application.Worker.Name,
            application.Worker.JobTitle,
            application.Worker.CityArea,
            application.Worker.State,
            application.Worker.Pincode,
            application.Status.ToString(),
            application.CreatedAt));
        var items = IsSqlite
            ? (await projected.ToListAsync(ct))
                .OrderByDescending(item => item.AppliedAt)
                .ThenBy(item => item.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToList()
            : await projected
                .OrderByDescending(item => item.AppliedAt)
                .ThenBy(item => item.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToListAsync(ct);

        return PagedResponse<ApplicantResponse>.Create(items, paging, totalCount);
    }

    public Task<ApplicantResponse> ShortlistApplicantAsync(Guid jobId, Guid applicationId, Guid employerId, CancellationToken ct)
        => SetApplicationStatusAsync(
            jobId, applicationId, ApplicationStatus.Shortlisted, employerId, ct);

    public async Task<ApplicantResponse> SetApplicationStatusAsync(
        Guid jobId,
        Guid applicationId,
        ApplicationStatus target,
        Guid employerId,
        CancellationToken ct)
    {
        var jobPost = await _db.JobPosts.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId, ct);
        if (jobPost is null)
            throw new NotFoundException(JobPostNotFoundMessage);

        var application = await _db.JobApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.JobPostId == jobId, ct);
        if (application is null)
            throw new NotFoundException("Application not found.");

        if (!CanTransition(application.Status, target))
            throw new ConflictException(
                $"Application cannot move from {application.Status} to {target}.");

        application.Status = target;
        application.StatusUpdatedAt = DateTimeOffset.UtcNow;
        if (target == ApplicationStatus.Shortlisted)
            _notifications.NotifyShortlisted(application.WorkerId, jobPost);
        else
            _notifications.NotifyApplicationOutcome(application.WorkerId, jobPost, target);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException(
                "Application status changed while this decision was being processed.");
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

    private static bool CanTransition(ApplicationStatus current, ApplicationStatus target) =>
        (current, target) is
            (ApplicationStatus.Applied, ApplicationStatus.Shortlisted) or
            (ApplicationStatus.Applied, ApplicationStatus.Rejected) or
            (ApplicationStatus.Shortlisted, ApplicationStatus.Hired) or
            (ApplicationStatus.Shortlisted, ApplicationStatus.Rejected);

    public async Task<CandidateDetailResponse> GetCandidateDetailAsync(
        Guid workerId, Guid employerId, CancellationToken ct)
    {
        var worker = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == workerId && u.Role == UserRole.LookingForWork, ct);
        if (worker is null)
            throw new NotFoundException("Candidate not found.");

        var hasApplied = await _candidateAccess.CanViewAsync(employerId, workerId, ct);

        return new CandidateDetailResponse(
            worker.Id,
            worker.Name,
            hasApplied ? worker.Email : null,
            hasApplied,
            worker.JobTitle,
            worker.Gender,
            worker.DateOfBirth,
            hasApplied ? worker.AddressLine : null,
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
            hasApplied && worker.ResumeKey is not null,
            worker.WorkPreferences,
            worker.WorkHistory,
            worker.EducationHistory,
            worker.SkillDetails,
            worker.LanguageDetails,
            hasApplied ? worker.Credentials : null);
    }

    public async Task<ResumeFileReference> GetCandidateResumeAsync(
        Guid workerId, Guid employerId, CancellationToken ct)
    {
        if (!await _candidateAccess.CanViewAsync(employerId, workerId, ct))
            throw new NotFoundException("Resume not found.");

        var resume = await _db.Users
            .Where(user => user.Id == workerId && user.Role == UserRole.LookingForWork)
            .Select(user => new { user.ResumeKey, user.ResumeFileName })
            .FirstOrDefaultAsync(ct);

        if (resume?.ResumeKey is null)
            throw new NotFoundException("Resume not found.");

        return new ResumeFileReference(resume.ResumeKey, resume.ResumeFileName ?? "resume");
    }

    public async Task<IReadOnlyList<JobPostResponse>> GetNearbyJobsAsync(
        double? lat, double? lng, string? search, EmploymentType? employmentType,
        Guid workerId, CancellationToken ct)
    {
        var term = search?.Trim();
        var hasSearch = !string.IsNullOrEmpty(term);
        var query = ApplyJobFilters(_db.JobPosts.Where(j => j.IsActive), term, employmentType);

        if (lat is not null && lng is not null && !hasSearch)
        {
            var nearbyQuery = ApplyJobBoundingBox(query, lat.Value, lng.Value);

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

        if (!hasSearch && lat is null)
            query = await ApplyWorkerStateDefaultAsync(query, workerId, ct);

        // Keep the cap before the in-memory ranking: SQLite cannot order
        // DateTimeOffset or translate the Haversine calculation, and the bound
        // prevents an unbounded materialization. The final in-memory ranking
        // and Take(60) below remain unchanged.
        var matchedJobs = await query
            .Select(j => new { Job = j, Count = j.Applications.Count })
            .Take(200)
            .ToListAsync(ct);

        var ranked = lat is not null && lng is not null
            ? matchedJobs.OrderBy(x => GeoCalculator.HaversineDistance(
                lat.Value, lng.Value, x.Job.Latitude, x.Job.Longitude))
            : matchedJobs.OrderByDescending(x => x.Job.CreatedAt);

        return ranked
            .Take(60)
            .Select(x => JobMapper.ToResponse(x.Job, x.Count))
            .ToList();
    }

    public async Task<PagedResponse<JobPostResponse>> SearchJobsAsync(
        double? lat, double? lng, string? search, EmploymentType? employmentType,
        Guid workerId, PagingRequest paging, CancellationToken ct)
    {
        var term = search?.Trim();
        var hasSearch = !string.IsNullOrEmpty(term);
        var query = ApplyJobFilters(_db.JobPosts.Where(job => job.IsActive), term, employmentType);

        if (!hasSearch && lat is null)
            query = await ApplyWorkerStateDefaultAsync(query, workerId, ct);

        if (lat is not null && lng is not null)
        {
            if (!hasSearch)
                query = ApplyJobBoundingBox(query, lat.Value, lng.Value);

            // ponytail: filtered in-memory distance sort; use PostGIS if measured volume makes it expensive.
            var matched = await query
                .Select(job => new { Job = job, Count = job.Applications.Count })
                .ToListAsync(ct);
            var ranked = matched
                .Select(item => new
                {
                    item.Job,
                    item.Count,
                    Distance = GeoCalculator.HaversineDistance(
                        lat.Value, lng.Value, item.Job.Latitude, item.Job.Longitude)
                })
                .Where(item => hasSearch || item.Distance <= NearbyRadiusKm)
                .OrderBy(item => item.Distance)
                .ThenByDescending(item => item.Job.CreatedAt)
                .ThenBy(item => item.Job.Id)
                .ToList();

            return PagedResponse<JobPostResponse>.Create(
                ranked.Skip(paging.Skip).Take(paging.PageSize)
                    .Select(item => JobMapper.ToResponse(item.Job, item.Count)).ToList(),
                paging, ranked.Count);
        }

        var totalCount = await query.CountAsync(ct);
        var projected = query.Select(job => new { Job = job, Count = job.Applications.Count });
        var page = IsSqlite
            ? (await projected.ToListAsync(ct))
                .OrderByDescending(item => item.Job.CreatedAt)
                .ThenBy(item => item.Job.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToList()
            : await projected
                .OrderByDescending(item => item.Job.CreatedAt)
                .ThenBy(item => item.Job.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToListAsync(ct);

        return PagedResponse<JobPostResponse>.Create(
            page.Select(item => JobMapper.ToResponse(item.Job, item.Count)).ToList(),
            paging, totalCount);
    }

    private static IQueryable<JobPost> ApplyJobBoundingBox(
        IQueryable<JobPost> query, double lat, double lng)
    {
        var box = GeoCalculator.GetBoundingBox(lat, lng, NearbyRadiusKm);
        var nearbyQuery = query
            .Where(j => j.Latitude != null && j.Longitude != null)
            .Where(j => j.Latitude >= box.MinLat && j.Latitude <= box.MaxLat);

        if (box.CoversAllLongitudes)
            return nearbyQuery;
        if (box.MinLng < -180)
            return nearbyQuery.Where(j => j.Longitude >= box.MinLng + 360 || j.Longitude <= box.MaxLng);
        if (box.MaxLng > 180)
            return nearbyQuery.Where(j => j.Longitude >= box.MinLng || j.Longitude <= box.MaxLng - 360);
        return nearbyQuery.Where(j => j.Longitude >= box.MinLng && j.Longitude <= box.MaxLng);
    }

    public async Task<JobPostResponse> GetActiveJobAsync(Guid id, CancellationToken ct)
    {
        var result = await _db.JobPosts
            .Where(j => j.Id == id && j.IsActive)
            .Select(j => new { Job = j, Count = j.Applications.Count })
            .FirstOrDefaultAsync(ct);

        return result is null
            ? throw new NotFoundException("Job post not found or no longer active.")
            : JobMapper.ToResponse(result.Job, result.Count);
    }

    private static IQueryable<JobPost> ApplyJobFilters(
        IQueryable<JobPost> query, string? term, EmploymentType? employmentType)
    {
        if (!string.IsNullOrEmpty(term))
        {
            var needle = term.ToLower();
#pragma warning disable CA1862 // EF Core cannot translate StringComparison overloads to SQL.
            query = query.Where(j =>
                j.Title.ToLower().Contains(needle) ||
                j.Description.ToLower().Contains(needle) ||
                j.WorkplaceName.ToLower().Contains(needle) ||
                j.CityArea.ToLower().Contains(needle) ||
                (j.State != null && j.State.ToLower().Contains(needle)) ||
                (j.Pincode != null && j.Pincode.Contains(needle)));
#pragma warning restore CA1862
        }

        return employmentType is null
            ? query
            : query.Where(j => j.EmploymentType == employmentType);
    }

    private async Task<IQueryable<JobPost>> ApplyWorkerStateDefaultAsync(
        IQueryable<JobPost> query, Guid workerId, CancellationToken ct)
    {
        var workerState = await _db.Users
            .Where(u => u.Id == workerId)
            .Select(u => u.State)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(workerState)
            ? query
            : query.Where(j => j.State != null && j.State == workerState);
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

    public async Task<PagedResponse<CandidateResponse>> SearchCandidatesAsync(
        double? lat, double? lng, string? search, string? role,
        Guid employerId, PagingRequest paging, CancellationToken ct)
    {
        var term = search?.Trim();
        var hasSearch = !string.IsNullOrEmpty(term);
        var query = ApplyCandidateFilters(
            _db.Users.Where(user => user.Role == UserRole.LookingForWork), term, role);

        if (!hasSearch && lat is null)
            query = await ApplyEmployerStateDefaultAsync(query, employerId, ct);

        if (lat is not null && lng is not null)
        {
            if (!hasSearch)
                query = ApplyBoundingBox(query, lat.Value, lng.Value);

            // ponytail: filtered in-memory distance sort; use PostGIS if measured volume makes it expensive.
            var ranked = (await query.ToListAsync(ct))
                .Select(user => new
                {
                    User = user,
                    Distance = GeoCalculator.HaversineDistance(
                        lat.Value, lng.Value, user.Latitude, user.Longitude)
                })
                .Where(item => hasSearch || item.Distance <= NearbyRadiusKm)
                .OrderBy(item => item.Distance)
                .ThenByDescending(item => item.User.CreatedAt)
                .ThenBy(item => item.User.Id)
                .ToList();

            return PagedResponse<CandidateResponse>.Create(
                ranked.Skip(paging.Skip).Take(paging.PageSize)
                    .Select(item => ToCandidateResponse(
                        item.User, item.Distance >= double.MaxValue ? null : item.Distance))
                    .ToList(),
                paging, ranked.Count);
        }

        var totalCount = await query.CountAsync(ct);
        var workers = IsSqlite
            ? (await query.ToListAsync(ct))
                .OrderByDescending(user => user.CreatedAt)
                .ThenBy(user => user.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToList()
            : await query
                .OrderByDescending(user => user.CreatedAt)
                .ThenBy(user => user.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToListAsync(ct);

        return PagedResponse<CandidateResponse>.Create(
            workers.Select(user => ToCandidateResponse(user, null)).ToList(),
            paging, totalCount);
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

    public async Task<IReadOnlyList<Guid>> GetSavedCandidateIdsAsync(
        Guid employerId, CancellationToken ct) =>
        await _db.SavedCandidates
            .Where(savedCandidate => savedCandidate.EmployerId == employerId)
            .Select(savedCandidate => savedCandidate.WorkerId)
            .ToListAsync(ct);

    public async Task<PagedResponse<CandidateResponse>> GetSavedCandidatesPagedAsync(
        Guid employerId, PagingRequest paging, CancellationToken ct)
    {
        var query = _db.SavedCandidates.Where(item => item.EmployerId == employerId);
        var totalCount = await query.CountAsync(ct);
        var rows = IsSqlite
            ? (await query.Include(item => item.Worker).ToListAsync(ct))
                .OrderByDescending(item => item.CreatedAt)
                .ThenBy(item => item.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToList()
            : await query
                .Include(item => item.Worker)
                .OrderByDescending(item => item.CreatedAt)
                .ThenBy(item => item.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToListAsync(ct);

        return PagedResponse<CandidateResponse>.Create(
            rows.Select(item => ToCandidateResponse(item.Worker, null)).ToList(),
            paging, totalCount);
    }

    public async Task SaveCandidateAsync(
        Guid workerId, Guid employerId, CancellationToken ct)
    {
        if (!await _db.Users.AnyAsync(
                user => user.Id == workerId && user.Role == UserRole.LookingForWork, ct))
            throw new NotFoundException("Candidate not found.");

        if (await _db.SavedCandidates.AnyAsync(
                savedCandidate => savedCandidate.EmployerId == employerId
                    && savedCandidate.WorkerId == workerId, ct))
            return;

        var savedCandidate = new SavedCandidate
        {
            Id = Guid.NewGuid(),
            EmployerId = employerId,
            WorkerId = workerId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.SavedCandidates.Add(savedCandidate);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            _db.Entry(savedCandidate).State = EntityState.Detached;
            if (!await _db.SavedCandidates.AnyAsync(
                    item => item.EmployerId == employerId && item.WorkerId == workerId, ct))
                throw;
        }
    }

    public async Task RemoveSavedCandidateAsync(
        Guid workerId, Guid employerId, CancellationToken ct)
    {
        var savedCandidate = await _db.SavedCandidates.FirstOrDefaultAsync(
            item => item.EmployerId == employerId && item.WorkerId == workerId, ct);
        if (savedCandidate is null)
            return;

        _db.SavedCandidates.Remove(savedCandidate);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<JobApplicationResponse> ApplyAsync(Guid jobId, Guid workerId, CancellationToken ct)
    {
        var jobPost = await _db.JobPosts.FirstOrDefaultAsync(j => j.Id == jobId && j.IsActive, ct)
            ?? throw new NotFoundException("Job post not found or no longer active.");

        var existing = await _db.JobApplications
            .AnyAsync(a => a.JobPostId == jobId && a.WorkerId == workerId, ct);
        if (existing)
            throw new ConflictException("You have already applied to this job.");

        var now = DateTimeOffset.UtcNow;
        var application = new JobApplication
        {
            Id = Guid.NewGuid(),
            JobPostId = jobId,
            WorkerId = workerId,
            Status = ApplicationStatus.Applied,
            CreatedAt = now,
            StatusUpdatedAt = now
        };

        _db.JobApplications.Add(application);
        _notifications.NotifyNewApplication(jobPost.EmployerId, jobPost);
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
            application.Status.ToString(), application.CreatedAt,
            application.StatusUpdatedAt.Value);
    }

    public async Task<IReadOnlyList<JobApplicationResponse>> GetMyApplicationsAsync(Guid workerId, CancellationToken ct)
    {
        var applications = await _db.JobApplications
            .Where(a => a.WorkerId == workerId)
            .Select(a => new JobApplicationResponse(
                a.Id, a.JobPostId, a.JobPost.Title,
                a.JobPost.WorkplaceName, a.JobPost.CityArea,
                a.Status.ToString(), a.CreatedAt,
                a.StatusUpdatedAt ?? a.CreatedAt))
            .ToListAsync(ct);

        return applications.OrderByDescending(a => a.CreatedAt).ToList();
    }

    public async Task<ApplicationPagedResponse> GetMyApplicationsPagedAsync(
        Guid workerId, PagingRequest paging, CancellationToken ct)
    {
        var query = _db.JobApplications.Where(application => application.WorkerId == workerId);
        var totalCount = await query.CountAsync(ct);
        var projected = query.Select(application => new JobApplicationResponse(
            application.Id, application.JobPostId, application.JobPost.Title,
            application.JobPost.WorkplaceName, application.JobPost.CityArea,
            application.Status.ToString(), application.CreatedAt,
            application.StatusUpdatedAt ?? application.CreatedAt));
        var items = IsSqlite
            ? (await projected.ToListAsync(ct))
                .OrderByDescending(item => item.CreatedAt)
                .ThenBy(item => item.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToList()
            : await projected
                .OrderByDescending(item => item.CreatedAt)
                .ThenBy(item => item.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToListAsync(ct);

        var shortlistedCount = await query.CountAsync(
            application => application.Status == ApplicationStatus.Shortlisted, ct);
        var hiredCount = await query.CountAsync(
            application => application.Status == ApplicationStatus.Hired, ct);
        var totalPages = totalCount == 0
            ? 0
            : (totalCount - 1) / paging.PageSize + 1;
        return new ApplicationPagedResponse(
            items, paging.Page, paging.PageSize, totalCount, totalPages,
            shortlistedCount, hiredCount);
    }

    public async Task<IReadOnlyList<Guid>> GetSavedJobIdsAsync(
        Guid workerId, CancellationToken ct) =>
        await _db.SavedJobs
            .Where(savedJob => savedJob.WorkerId == workerId)
            .Select(savedJob => savedJob.JobPostId)
            .ToListAsync(ct);

    public async Task<PagedResponse<JobPostResponse>> GetSavedJobsPagedAsync(
        Guid workerId, PagingRequest paging, CancellationToken ct)
    {
        var query = _db.SavedJobs.Where(item => item.WorkerId == workerId);
        var totalCount = await query.CountAsync(ct);
        var projected = query.Select(item => new
        {
            Saved = item,
            Job = item.JobPost,
            Count = item.JobPost.Applications.Count
        });
        var rows = IsSqlite
            ? (await projected.ToListAsync(ct))
                .OrderByDescending(item => item.Saved.CreatedAt)
                .ThenBy(item => item.Saved.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToList()
            : await projected
                .OrderByDescending(item => item.Saved.CreatedAt)
                .ThenBy(item => item.Saved.Id)
                .Skip(paging.Skip)
                .Take(paging.PageSize)
                .ToListAsync(ct);

        return PagedResponse<JobPostResponse>.Create(
            rows.Select(item => JobMapper.ToResponse(item.Job, item.Count)).ToList(),
            paging, totalCount);
    }

    public async Task SaveJobAsync(Guid jobId, Guid workerId, CancellationToken ct)
    {
        if (!await _db.JobPosts.AnyAsync(jobPost => jobPost.Id == jobId && jobPost.IsActive, ct))
            throw new NotFoundException("Job post not found or no longer active.");

        if (await _db.SavedJobs.AnyAsync(
                savedJob => savedJob.WorkerId == workerId && savedJob.JobPostId == jobId, ct))
            return;

        var savedJob = new SavedJob
        {
            Id = Guid.NewGuid(),
            WorkerId = workerId,
            JobPostId = jobId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.SavedJobs.Add(savedJob);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            _db.Entry(savedJob).State = EntityState.Detached;
            if (!await _db.SavedJobs.AnyAsync(
                    item => item.WorkerId == workerId && item.JobPostId == jobId, ct))
                throw;
        }
    }

    public async Task RemoveSavedJobAsync(Guid jobId, Guid workerId, CancellationToken ct)
    {
        var savedJob = await _db.SavedJobs.FirstOrDefaultAsync(
            item => item.WorkerId == workerId && item.JobPostId == jobId, ct);
        if (savedJob is null)
            return;

        _db.SavedJobs.Remove(savedJob);
        await _db.SaveChangesAsync(ct);
    }

    private bool IsSqlite =>
        _db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";
}
