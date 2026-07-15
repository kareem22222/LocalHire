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
            .Select(j => new { Job = j, Count = j.Applications.Count })
            .ToListAsync(ct);

        return jobs
            .OrderByDescending(x => x.Job.CreatedAt)
            .Select(x => JobMapper.ToResponse(x.Job, x.Count))
            .ToList();
    }

    public async Task<JobPostResponse> GetJobAsync(Guid id, Guid employerId, CancellationToken ct)
    {
        var result = await _db.JobPosts
            .Where(j => j.Id == id && j.EmployerId == employerId)
            .Select(j => new { Job = j, Count = j.Applications.Count })
            .FirstOrDefaultAsync(ct);

        if (result is null)
            throw new NotFoundException("Job post not found.");

        return JobMapper.ToResponse(result.Job, result.Count);
    }

    public async Task<JobPostResponse> UpdateJobAsync(Guid id, CreateJobPostRequest request, Guid employerId, CancellationToken ct)
    {
        var jobPost = await _db.JobPosts.FirstOrDefaultAsync(j => j.Id == id && j.EmployerId == employerId, ct);
        if (jobPost is null)
            throw new NotFoundException("Job post not found.");

        JobMapper.ApplyRequest(jobPost, request);

        await _db.SaveChangesAsync(ct);

        var count = await _db.JobApplications.CountAsync(a => a.JobPostId == id, ct);
        return JobMapper.ToResponse(jobPost, count);
    }

    public async Task<IReadOnlyList<ApplicantResponse>> GetApplicationsAsync(Guid jobId, Guid employerId, CancellationToken ct)
    {
        var jobPost = await _db.JobPosts.FirstOrDefaultAsync(j => j.Id == jobId && j.EmployerId == employerId, ct);
        if (jobPost is null)
            throw new NotFoundException("Job post not found.");

        var applications = await _db.JobApplications
            .Where(a => a.JobPostId == jobId)
            .Select(a => new ApplicantResponse(
                a.Id, a.Worker.Name, a.Status.ToString(), a.CreatedAt))
            .ToListAsync(ct);

        return applications.OrderByDescending(a => a.AppliedAt).ToList();
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
        var query = _db.Users.Where(u => u.Role == UserRole.LookingForWork);

        var term = search?.Trim();
        var hasSearch = !string.IsNullOrEmpty(term);
        if (hasSearch)
        {
            var pattern = $"%{term}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.Name, pattern) ||
                (u.JobTitle != null && EF.Functions.ILike(u.JobTitle, pattern)) ||
                (u.CityArea != null && EF.Functions.ILike(u.CityArea, pattern)) ||
                (u.State != null && EF.Functions.ILike(u.State, pattern)) ||
                (u.Pincode != null && EF.Functions.ILike(u.Pincode, pattern)));
        }

        var roleFilter = role?.Trim();
        if (!string.IsNullOrEmpty(roleFilter))
        {
            query = query.Where(u => u.JobTitle != null && u.JobTitle == roleFilter);
        }

        // With coordinates and NO typed search term this is the "talent near your
        // business" default, so results are restricted to the local radius. A typed
        // search term is an explicit, location-independent request (e.g. a pincode
        // or city in another state), so it must NOT be constrained by the radius —
        // matches anywhere should surface (ordered by proximity further below).
        if (lat is not null && lng is not null && !hasSearch)
        {
            var box = GeoCalculator.GetBoundingBox(lat.Value, lng.Value, NearbyRadiusKm);

            var nearbyQuery = query
                .Where(u => u.Latitude != null && u.Longitude != null)
                .Where(u => u.Latitude >= box.MinLat && u.Latitude <= box.MaxLat);

            if (!box.CoversAllLongitudes)
            {
                if (box.MinLng < -180)
                    nearbyQuery = nearbyQuery.Where(u => u.Longitude >= box.MinLng + 360 || u.Longitude <= box.MaxLng);
                else if (box.MaxLng > 180)
                    nearbyQuery = nearbyQuery.Where(u => u.Longitude >= box.MinLng || u.Longitude <= box.MaxLng - 360);
                else
                    nearbyQuery = nearbyQuery.Where(u => u.Longitude >= box.MinLng && u.Longitude <= box.MaxLng);
            }

            var workers = await nearbyQuery.ToListAsync(ct);

            return workers
                .Select(u => new
                {
                    User = u,
                    Distance = GeoCalculator.HaversineDistance(lat.Value, lng.Value, u.Latitude, u.Longitude)
                })
                .Where(x => x.Distance <= NearbyRadiusKm)
                .OrderBy(x => x.Distance)
                .Select(x => ToCandidateResponse(x.User, x.Distance))
                .ToList();
        }

        // No typed search term and no coordinates: default the list to workers in
        // the employer's own state so the results stay locally relevant.
        if (!hasSearch)
        {
            var employerState = await _db.Users
                .Where(u => u.Id == employerId)
                .Select(u => u.State)
                .FirstOrDefaultAsync(ct);

            if (!string.IsNullOrWhiteSpace(employerState))
            {
                query = query.Where(u => u.State != null && u.State == employerState);
            }
        }

        // Reaches here for a global search (typed term, with or without
        // coordinates) or the state-default fallback. Cap the fetch, then order by
        // proximity when we have an origin so the nearest matches come first while
        // still surfacing matches that lie outside the local radius.
        var matchedWorkers = await query
            .OrderByDescending(u => u.CreatedAt)
            .Take(200)
            .ToListAsync(ct);

        if (lat is not null && lng is not null)
        {
            return matchedWorkers
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

        return matchedWorkers
            .Take(60)
            .Select(u => ToCandidateResponse(u, null))
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
