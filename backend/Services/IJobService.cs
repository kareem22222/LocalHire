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

    Task<JobApplicationResponse> ApplyAsync(Guid jobId, Guid workerId, CancellationToken ct);

    Task<IReadOnlyList<JobApplicationResponse>> GetMyApplicationsAsync(Guid workerId, CancellationToken ct);
}
