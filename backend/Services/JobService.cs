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
