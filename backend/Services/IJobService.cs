using LocalHire.Api.DTOs;
using LocalHire.Api.Models;

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
    /// Moves a single application into the <c>Shortlisted</c> state on behalf of
    /// the employer who owns the job. Returns the updated applicant. Throws when
    /// the job is not owned by <paramref name="employerId"/> or the application
    /// does not belong to that job.
    /// </summary>
    Task<ApplicantResponse> ShortlistApplicantAsync(Guid jobId, Guid applicationId, Guid employerId, CancellationToken ct);

    /// <summary>
    /// Applies a legal employer-owned application transition. Applied applications
    /// may be shortlisted or rejected; shortlisted applications may be hired or
    /// rejected. Hired and rejected applications are terminal.
    /// </summary>
    Task<ApplicantResponse> SetApplicationStatusAsync(
        Guid jobId,
        Guid applicationId,
        ApplicationStatus target,
        Guid employerId,
        CancellationToken ct);

    /// <summary>
    /// Returns profile detail for a single worker. Employers who have received
    /// an application from the worker get the full detail; other employers get
    /// a reduced detail without contact, resume, or credential data. The phone
    /// number is never included. Throws when the id does not resolve to a worker.
    /// </summary>
    Task<CandidateDetailResponse> GetCandidateDetailAsync(
        Guid workerId, Guid employerId, CancellationToken ct);

    Task<ResumeFileReference> GetCandidateResumeAsync(
        Guid workerId, Guid employerId, CancellationToken ct);

    /// <summary>
    /// Returns active jobs for a worker. Typed searches can match jobs anywhere;
    /// otherwise coordinates use the nearby radius and the default list is scoped
    /// to the worker's state.
    /// </summary>
    Task<IReadOnlyList<JobPostResponse>> GetNearbyJobsAsync(
        double? lat, double? lng, string? search, EmploymentType? employmentType,
        Guid workerId, CancellationToken ct);

    Task<JobPostResponse> GetActiveJobAsync(Guid id, CancellationToken ct);

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

    Task<IReadOnlyList<Guid>> GetSavedCandidateIdsAsync(Guid employerId, CancellationToken ct);
    Task SaveCandidateAsync(Guid workerId, Guid employerId, CancellationToken ct);
    Task RemoveSavedCandidateAsync(Guid workerId, Guid employerId, CancellationToken ct);

    Task<JobApplicationResponse> ApplyAsync(Guid jobId, Guid workerId, CancellationToken ct);

    Task<IReadOnlyList<JobApplicationResponse>> GetMyApplicationsAsync(Guid workerId, CancellationToken ct);

    Task<IReadOnlyList<Guid>> GetSavedJobIdsAsync(Guid workerId, CancellationToken ct);
    Task SaveJobAsync(Guid jobId, Guid workerId, CancellationToken ct);
    Task RemoveSavedJobAsync(Guid jobId, Guid workerId, CancellationToken ct);
}
