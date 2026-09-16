using LocalHire.Api.Models;

namespace LocalHire.Api.Services;

public interface INotificationService
{
    void NotifyJobUpdated(IEnumerable<Guid> workerIds, JobPost jobPost);

    void NotifyJobClosed(IEnumerable<Guid> workerIds, JobPost jobPost);

    void NotifyShortlisted(Guid workerId, JobPost jobPost);

    void NotifyNewApplication(Guid employerId, JobPost jobPost);

    void NotifyApplicationOutcome(Guid workerId, JobPost jobPost, Guid applicationId, ApplicationStatus status);

    void NotifyInvitation(Guid workerId, JobPost jobPost, Guid invitationId);

    void NotifyWithdrawal(Guid employerId, JobPost jobPost, Guid applicationId);

    void NotifyAppointment(Guid userId, JobPost jobPost, Guid applicationId, string status, bool recipientIsWorker);
}
