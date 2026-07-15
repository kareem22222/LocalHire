using LocalHire.Api.DTOs;

namespace LocalHire.Api.Services;

/// <summary>
/// Owns all job-post and job-application data access and business rules. Keeping
/// this behind an interface lets the HTTP endpoints stay thin (SRP) and depend on
/// an abstraction rather than <c>DbContext</c> directly (DIP).
/// </summary>
public interface IJobService
{
    Task<JobPostResponse> CreateJobAsync(CreateJobPostRequest request, Guid employerId, CancellationToken ct);

    Task<IReadOnlyList<JobPostResponse>> GetJobsForEmployerAsync(Guid employerId, CancellationToken ct);

    Task<JobPostResponse> GetJobAsync(Guid id, Guid employerId, CancellationToken ct);

    Task<JobPostResponse> UpdateJobAsync(Guid id, CreateJobPostRequest request, Guid employerId, CancellationToken ct);

    Task<IReadOnlyList<ApplicantResponse>> GetApplicationsAsync(Guid jobId, Guid employerId, CancellationToken ct);

    /// <summary>
    /// Returns active jobs. When <paramref name="lat"/> and <paramref name="lng"/>
    /// are supplied they are assumed already validated; results are filtered to a
    /// fixed radius and ordered by distance. Otherwise all active jobs are returned
    /// newest first.
    /// </summary>
    Task<IReadOnlyList<JobPostResponse>> GetNearbyJobsAsync(double? lat, double? lng, CancellationToken ct);

    /// <summary>
    /// Returns workers ("candidates") for an employer's talent search. An optional
    /// <paramref name="search"/> matches on name, role, area, state, or pincode and
    /// an optional <paramref name="role"/> restricts results to a specific job
    /// title. When <paramref name="lat"/> and <paramref name="lng"/> are supplied
    /// (assumed already validated) results are limited to a fixed radius and
    /// ordered by distance. When no coordinates and no search term are given the
    /// results default to workers in the requesting employer's own state (via
    /// <paramref name="employerId"/>) so the list stays locally relevant; if the
    /// employer has no state on file the most recently joined workers are returned.
    /// </summary>
    Task<IReadOnlyList<CandidateResponse>> GetNearbyCandidatesAsync(double? lat, double? lng, string? search, string? role, Guid employerId, CancellationToken ct);

    Task<JobApplicationResponse> ApplyAsync(Guid jobId, Guid workerId, CancellationToken ct);

    Task<IReadOnlyList<JobApplicationResponse>> GetMyApplicationsAsync(Guid workerId, CancellationToken ct);
}
