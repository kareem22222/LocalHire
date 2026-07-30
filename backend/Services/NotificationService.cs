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
        Guid workerId, JobPost jobPost, ApplicationStatus status)
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
