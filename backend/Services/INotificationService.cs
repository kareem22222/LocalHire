using LocalHire.Api.Models;

namespace LocalHire.Api.Services;

public interface INotificationService
{
    void NotifyJobUpdated(IEnumerable<Guid> workerIds, JobPost jobPost);

    void NotifyShortlisted(Guid workerId, JobPost jobPost);

    void NotifyNewApplication(Guid employerId, JobPost jobPost);

    void NotifyApplicationOutcome(Guid workerId, JobPost jobPost, ApplicationStatus status);
}
