using System.Globalization;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace LocalHire.Api.Services;

/// <summary>
/// Caches job query DTOs in-process. Every key includes the requesting user when
/// the result is user-specific. Successful writes advance a shared generation,
/// making all prior job-query entries unreachable until their short TTL expires.
/// </summary>
public sealed class CachedJobService : IJobService
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(2);

    private readonly JobService _inner;
    private readonly IMemoryCache _cache;
    private readonly JobCacheVersion _version;

    public CachedJobService(JobService inner, IMemoryCache cache, JobCacheVersion version)
    {
        _inner = inner;
        _cache = cache;
        _version = version;
    }

    public async Task<JobPostResponse> CreateJobAsync(
        CreateJobPostRequest request, Guid employerId, CancellationToken ct)
    {
        var result = await _inner.CreateJobAsync(request, employerId, ct);
        _version.Invalidate();
        return result;
    }

    public Task<IReadOnlyList<JobPostResponse>> GetJobsForEmployerAsync(
        Guid employerId, CancellationToken ct) =>
        GetOrCreateAsync($"employer:{employerId}:jobs",
            () => _inner.GetJobsForEmployerAsync(employerId, ct));

    public Task<JobPostResponse> GetJobAsync(Guid id, Guid employerId, CancellationToken ct) =>
        GetOrCreateAsync($"employer:{employerId}:job:{id}",
            () => _inner.GetJobAsync(id, employerId, ct));

    public async Task<JobPostResponse> UpdateJobAsync(
        Guid id, CreateJobPostRequest request, Guid employerId, CancellationToken ct)
    {
        var result = await _inner.UpdateJobAsync(id, request, employerId, ct);
        _version.Invalidate();
        return result;
    }

    public Task<IReadOnlyList<ApplicantResponse>> GetApplicationsAsync(
        Guid jobId, Guid employerId, CancellationToken ct) =>
        GetOrCreateAsync($"employer:{employerId}:job:{jobId}:applications",
            () => _inner.GetApplicationsAsync(jobId, employerId, ct));

    public async Task<ApplicantResponse> ShortlistApplicantAsync(
        Guid jobId, Guid applicationId, Guid employerId, CancellationToken ct)
    {
        var result = await _inner.ShortlistApplicantAsync(jobId, applicationId, employerId, ct);
        _version.Invalidate();
        return result;
    }

    public async Task<ApplicantResponse> SetApplicationStatusAsync(
        Guid jobId,
        Guid applicationId,
        ApplicationStatus target,
        Guid employerId,
        CancellationToken ct)
    {
        var result = await _inner.SetApplicationStatusAsync(
            jobId, applicationId, target, employerId, ct);
        _version.Invalidate();
        return result;
    }

    public Task<CandidateDetailResponse> GetCandidateDetailAsync(
        Guid workerId, Guid employerId, CancellationToken ct) =>
        GetOrCreateAsync($"candidate-detail:{employerId}:{workerId}",
            () => _inner.GetCandidateDetailAsync(workerId, employerId, ct));

    // Recheck authorization and metadata for every short-lived URL the endpoint signs.
    public Task<ResumeFileReference> GetCandidateResumeAsync(
        Guid workerId, Guid employerId, CancellationToken ct) =>
        _inner.GetCandidateResumeAsync(workerId, employerId, ct);

    public Task<IReadOnlyList<JobPostResponse>> GetNearbyJobsAsync(
        double? lat, double? lng, string? search, EmploymentType? employmentType,
        Guid workerId, CancellationToken ct)
    {
        var location = lat is null || lng is null
            ? "all"
            : $"{lat.Value.ToString("F3", CultureInfo.InvariantCulture)}:{lng.Value.ToString("F3", CultureInfo.InvariantCulture)}";
        var term = string.IsNullOrWhiteSpace(search) ? string.Empty : search.Trim().ToLowerInvariant();
        var scope = location == "all" && term.Length == 0 ? workerId.ToString() : "global";
        return GetOrCreateAsync($"nearby:{scope}:{location}:{term}:{employmentType}",
            () => _inner.GetNearbyJobsAsync(lat, lng, search, employmentType, workerId, ct));
    }

    public Task<JobPostResponse> GetActiveJobAsync(Guid id, CancellationToken ct) =>
        GetOrCreateAsync($"active-job:{id}", () => _inner.GetActiveJobAsync(id, ct));

    public Task<IReadOnlyList<CandidateResponse>> GetNearbyCandidatesAsync(
        double? lat, double? lng, string? search, string? role, Guid employerId, CancellationToken ct)
    {
        var location = lat is null || lng is null
            ? "all"
            : $"{lat.Value.ToString("F3", CultureInfo.InvariantCulture)}:{lng.Value.ToString("F3", CultureInfo.InvariantCulture)}";
        var term = string.IsNullOrWhiteSpace(search) ? string.Empty : search.Trim().ToLowerInvariant();
        var roleKey = string.IsNullOrWhiteSpace(role) ? string.Empty : role.Trim().ToLowerInvariant();
        var scope = location == "all" && term.Length == 0 ? employerId.ToString() : "global";
        return GetOrCreateAsync($"candidates:{scope}:{location}:{term}:{roleKey}",
            () => _inner.GetNearbyCandidatesAsync(lat, lng, search, role, employerId, ct));
    }

    public async Task<JobApplicationResponse> ApplyAsync(
        Guid jobId, Guid workerId, CancellationToken ct)
    {
        var result = await _inner.ApplyAsync(jobId, workerId, ct);
        _version.Invalidate();
        return result;
    }

    public Task<IReadOnlyList<JobApplicationResponse>> GetMyApplicationsAsync(
        Guid workerId, CancellationToken ct) =>
        GetOrCreateAsync($"worker:{workerId}:applications",
            () => _inner.GetMyApplicationsAsync(workerId, ct));

    private async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory)
    {
        var versionedKey = $"jobs:v{_version.Current}:{key}";
        if (_cache.TryGetValue(versionedKey, out T? cached))
            return cached!;

        var result = await factory();
        _cache.Set(versionedKey, result, CacheDuration);
        return result;
    }
}

/// <summary>Singleton generation shared by all scoped job-service decorators.</summary>
public sealed class JobCacheVersion
{
    private long _current;

    public long Current => Interlocked.Read(ref _current);

    public void Invalidate() => Interlocked.Increment(ref _current);
}
