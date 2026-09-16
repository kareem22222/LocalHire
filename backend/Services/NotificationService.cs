using LocalHire.Api.Data;
using LocalHire.Api.Models;

namespace LocalHire.Api.Services;

public sealed class NotificationService(LocalHireDbContext db) : INotificationService
{
    public void NotifyJobUpdated(IEnumerable<Guid> workerIds, JobPost jobPost) =>
        db.Notifications.AddRange(workerIds.Select(workerId => Create(
            workerId,
            "JobUpdated",
            "An applied job was updated",
            $"{jobPost.Title} at {jobPost.WorkplaceName} has new details.",
            $"/work/jobs/{jobPost.Id}")));

    public void NotifyJobClosed(IEnumerable<Guid> workerIds, JobPost jobPost) =>
        db.Notifications.AddRange(workerIds.Select(workerId => Create(
            workerId,
            "JobClosed",
            "An applied job was closed",
            $"{jobPost.Title} at {jobPost.WorkplaceName} is no longer accepting applications.",
            $"/work/jobs/{jobPost.Id}")));

    public void NotifyShortlisted(Guid workerId, JobPost jobPost) =>
        db.Notifications.Add(Create(
            workerId,
            "Shortlisted",
            "You were shortlisted",
            $"{jobPost.WorkplaceName} shortlisted you for {jobPost.Title}.",
            $"/work/jobs/{jobPost.Id}"));

    public void NotifyNewApplication(Guid employerId, JobPost jobPost) =>
        db.Notifications.Add(Create(
            employerId,
            "NewApplication",
            "New application received",
            $"A candidate applied for {jobPost.Title}.",
            $"/hiring/jobs/{jobPost.Id}/applicants"));

    public void NotifyApplicationOutcome(
        Guid workerId, JobPost jobPost, Guid applicationId, ApplicationStatus status)
    {
        var notification = status switch
        {
            ApplicationStatus.Hired => Create(
                workerId,
                "Hired",
                "You were hired",
                $"{jobPost.WorkplaceName} hired you for {jobPost.Title}.",
                "/work/applications"),
            ApplicationStatus.Rejected => Create(
                workerId,
                "Rejected",
                "Application update",
                $"{jobPost.WorkplaceName} decided not to move forward with your application for {jobPost.Title}.",
                "/work/applications"),
            _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Only terminal outcomes create outcome notifications.")
        };
        db.Notifications.Add(notification);
        QueueEmail(workerId, $"application:{applicationId}:{status}", notification);
    }

    public void NotifyInvitation(Guid workerId, JobPost jobPost, Guid invitationId)
    {
        var notification = Create(
            workerId,
            "Invitation",
            "You were invited to apply",
            $"{jobPost.WorkplaceName} invited you to apply for {jobPost.Title}.",
            "/work/invitations");
        db.Notifications.Add(notification);
        QueueEmail(workerId, $"invitation:{invitationId}", notification);
    }

    public void NotifyWithdrawal(Guid employerId, JobPost jobPost, Guid applicationId)
    {
        var notification = Create(
            employerId,
            "ApplicationWithdrawn",
            "An application was withdrawn",
            $"A candidate withdrew their application for {jobPost.Title}.",
            $"/hiring/jobs/{jobPost.Id}/applicants");
        db.Notifications.Add(notification);
        QueueEmail(employerId, $"application:{applicationId}:Withdrawn", notification);
    }

    public void NotifyAppointment(
        Guid userId, JobPost jobPost, Guid applicationId, string status, bool recipientIsWorker)
    {
        var notification = Create(
            userId,
            "Appointment",
            $"Interview {status.ToLowerInvariant()}",
            $"The interview or trial shift for {jobPost.Title} is now {status.ToLowerInvariant()}.",
            recipientIsWorker ? "/work/applications" : $"/hiring/jobs/{jobPost.Id}/applicants");
        db.Notifications.Add(notification);
        QueueEmail(userId, $"appointment:{notification.Id}", notification);
    }

    private void QueueEmail(Guid userId, string dedupeKey, Notification notification)
    {
        db.EmailOutboxMessages.Add(new EmailOutboxMessage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            DedupeKey = dedupeKey,
            Subject = notification.Title,
            Body = notification.Message,
            Link = notification.Link,
            CreatedAt = notification.CreatedAt,
            NextAttemptAt = notification.CreatedAt
        });
    }

    private static Notification Create(
        Guid userId, string type, string title, string message, string link) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Type = type,
        Title = title,
        Message = message,
        Link = link,
        CreatedAt = DateTimeOffset.UtcNow
    };
}
