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

    public Task<PagedResponse<JobPostResponse>> GetJobsForEmployerPagedAsync(
        Guid employerId, JobStatusFilter? status, bool shortlistedOnly,
        PagingRequest paging, CancellationToken ct) =>
        GetOrCreateAsync(
            $"employer:{employerId}:jobs:{status}:{shortlistedOnly}:{paging.Page}:{paging.PageSize}",
            () => _inner.GetJobsForEmployerPagedAsync(
                employerId, status, shortlistedOnly, paging, ct));

    public Task<JobPostResponse> GetJobAsync(Guid id, Guid employerId, CancellationToken ct) =>
        GetOrCreateAsync($"employer:{employerId}:job:{id}",
            () => _inner.GetJobAsync(id, employerId, ct));

    public Task<PublicJobResponse> GetPublicJobAsync(Guid id, CancellationToken ct) =>
        GetOrCreateAsync($"public-job:{id}", () => _inner.GetPublicJobAsync(id, ct));

    public async Task<JobPostResponse> UpdateJobAsync(
        Guid id, CreateJobPostRequest request, Guid employerId, CancellationToken ct)
    {
        var result = await _inner.UpdateJobAsync(id, request, employerId, ct);
        _version.Invalidate();
        return result;
    }

    public async Task<JobPostResponse> SetJobActiveAsync(
        Guid id, bool isActive, Guid employerId, CancellationToken ct)
    {
        var result = await _inner.SetJobActiveAsync(id, isActive, employerId, ct);
        _version.Invalidate();
        return result;
    }

    public Task<IReadOnlyList<ApplicantResponse>> GetApplicationsAsync(
        Guid jobId, Guid employerId, CancellationToken ct) =>
        GetOrCreateAsync($"employer:{employerId}:job:{jobId}:applications",
            () => _inner.GetApplicationsAsync(jobId, employerId, ct));

    public Task<PagedResponse<ApplicantResponse>> GetApplicationsPagedAsync(
        Guid jobId, Guid employerId, ApplicationStatus? status,
        PagingRequest paging, CancellationToken ct) =>
        GetOrCreateAsync(
            $"employer:{employerId}:job:{jobId}:applications:{status}:{paging.Page}:{paging.PageSize}",
            () => _inner.GetApplicationsPagedAsync(
                jobId, employerId, status, paging, ct));

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
        _inner.GetCandidateDetailAsync(workerId, employerId, ct);

    // Recheck authorization and metadata for every short-lived URL the endpoint signs.
    public Task<ResumeFileReference> GetCandidateResumeAsync(
        Guid workerId, Guid employerId, CancellationToken ct) =>
        _inner.GetCandidateResumeAsync(workerId, employerId, ct);

    public Task<IReadOnlyList<JobPostResponse>> GetNearbyJobsAsync(
        double? lat, double? lng, string? search, EmploymentType? employmentType,
        decimal? salaryMin, decimal? salaryMax, SalaryPeriod? salaryPeriod,
        int? experienceYears, double? maxDistanceKm,
        Guid workerId, CancellationToken ct) =>
        _inner.GetNearbyJobsAsync(
            lat, lng, search, employmentType, salaryMin, salaryMax, salaryPeriod,
            experienceYears, maxDistanceKm, workerId, ct);

    public Task<PagedResponse<JobPostResponse>> SearchJobsAsync(
        double? lat, double? lng, string? search, EmploymentType? employmentType,
        decimal? salaryMin, decimal? salaryMax, SalaryPeriod? salaryPeriod,
        int? experienceYears, double? maxDistanceKm,
        Guid workerId, PagingRequest paging, CancellationToken ct) =>
        _inner.SearchJobsAsync(
            lat, lng, search, employmentType, salaryMin, salaryMax, salaryPeriod,
            experienceYears, maxDistanceKm, workerId, paging, ct);

    public Task<JobPostResponse> GetWorkerJobAsync(Guid id, Guid workerId, CancellationToken ct) =>
        _inner.GetWorkerJobAsync(id, workerId, ct);

    public Task<IReadOnlyList<CandidateResponse>> GetNearbyCandidatesAsync(
        double? lat, double? lng, string? search, string? role, Guid employerId, CancellationToken ct) =>
        _inner.GetNearbyCandidatesAsync(lat, lng, search, role, employerId, ct);

    public Task<PagedResponse<CandidateResponse>> SearchCandidatesAsync(
        double? lat, double? lng, string? search, string? role,
        Guid employerId, PagingRequest paging, CancellationToken ct) =>
        _inner.SearchCandidatesAsync(lat, lng, search, role, employerId, paging, ct);

    public async Task<JobApplicationResponse> ApplyAsync(
        Guid jobId, Guid workerId, CancellationToken ct)
    {
        var result = await _inner.ApplyAsync(jobId, workerId, ct);
        _version.Invalidate();
        return result;
    }

    public async Task<JobApplicationResponse> WithdrawApplicationAsync(
        Guid applicationId, Guid workerId, CancellationToken ct)
    {
        var result = await _inner.WithdrawApplicationAsync(applicationId, workerId, ct);
        _version.Invalidate();
        return result;
    }

    public Task<IReadOnlyList<Guid>> GetSavedCandidateIdsAsync(Guid employerId, CancellationToken ct) =>
        _inner.GetSavedCandidateIdsAsync(employerId, ct);

    public Task<PagedResponse<CandidateResponse>> GetSavedCandidatesPagedAsync(
        Guid employerId, PagingRequest paging, CancellationToken ct) =>
        _inner.GetSavedCandidatesPagedAsync(employerId, paging, ct);

    public async Task SaveCandidateAsync(Guid workerId, Guid employerId, CancellationToken ct)
    {
        await _inner.SaveCandidateAsync(workerId, employerId, ct);
        _version.Invalidate();
    }

    public async Task RemoveSavedCandidateAsync(Guid workerId, Guid employerId, CancellationToken ct)
    {
        await _inner.RemoveSavedCandidateAsync(workerId, employerId, ct);
        _version.Invalidate();
    }

    public Task<IReadOnlyList<JobApplicationResponse>> GetMyApplicationsAsync(
        Guid workerId, CancellationToken ct) =>
        GetOrCreateAsync($"worker:{workerId}:applications",
            () => _inner.GetMyApplicationsAsync(workerId, ct));

    public Task<ApplicationPagedResponse> GetMyApplicationsPagedAsync(
        Guid workerId, PagingRequest paging, CancellationToken ct) =>
        GetOrCreateAsync(
            $"worker:{workerId}:applications:{paging.Page}:{paging.PageSize}",
            () => _inner.GetMyApplicationsPagedAsync(workerId, paging, ct));

    public Task<IReadOnlyList<Guid>> GetSavedJobIdsAsync(Guid workerId, CancellationToken ct) =>
        _inner.GetSavedJobIdsAsync(workerId, ct);

    public Task<PagedResponse<JobPostResponse>> GetSavedJobsPagedAsync(
        Guid workerId, PagingRequest paging, CancellationToken ct) =>
        GetOrCreateAsync(
            $"worker:{workerId}:saved-jobs:{paging.Page}:{paging.PageSize}",
            () => _inner.GetSavedJobsPagedAsync(workerId, paging, ct));

    public async Task SaveJobAsync(Guid jobId, Guid workerId, CancellationToken ct)
    {
        await _inner.SaveJobAsync(jobId, workerId, ct);
        _version.Invalidate();
    }

    public async Task RemoveSavedJobAsync(Guid jobId, Guid workerId, CancellationToken ct)
    {
        await _inner.RemoveSavedJobAsync(jobId, workerId, ct);
        _version.Invalidate();
    }

    public async Task<InvitationResponse> CreateInvitationAsync(
        Guid workerId, Guid jobId, Guid employerId, CancellationToken ct)
    {
        var result = await _inner.CreateInvitationAsync(workerId, jobId, employerId, ct);
        _version.Invalidate();
        return result;
    }

    public Task<IReadOnlyList<InvitationResponse>> GetMyInvitationsAsync(
        Guid workerId, CancellationToken ct) =>
        _inner.GetMyInvitationsAsync(workerId, ct);

    public async Task<InvitationResponse> DeclineInvitationAsync(
        Guid invitationId, Guid workerId, CancellationToken ct)
    {
        var result = await _inner.DeclineInvitationAsync(invitationId, workerId, ct);
        _version.Invalidate();
        return result;
    }

    public Task<AppointmentResponse?> GetAppointmentAsync(
        Guid applicationId, Guid userId, UserRole role, CancellationToken ct) =>
        _inner.GetAppointmentAsync(applicationId, userId, role, ct);

    public async Task<AppointmentResponse> SetAppointmentAsync(
        Guid applicationId, AppointmentRequest request, Guid userId, UserRole role, CancellationToken ct)
    {
        var result = await _inner.SetAppointmentAsync(applicationId, request, userId, role, ct);
        _version.Invalidate();
        return result;
    }

    public async Task<AppointmentResponse> ConfirmAppointmentAsync(
        Guid applicationId, Guid userId, UserRole role, CancellationToken ct)
    {
        var result = await _inner.ConfirmAppointmentAsync(applicationId, userId, role, ct);
        _version.Invalidate();
        return result;
    }

    public async Task<AppointmentResponse> CancelAppointmentAsync(
        Guid applicationId, Guid userId, UserRole role, CancellationToken ct)
    {
        var result = await _inner.CancelAppointmentAsync(applicationId, userId, role, ct);
        _version.Invalidate();
        return result;
    }

    public Task<BusinessProfileResponse> GetBusinessProfileAsync(
        Guid employerId, CancellationToken ct) =>
        _inner.GetBusinessProfileAsync(employerId, ct);

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
