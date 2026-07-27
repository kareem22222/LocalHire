using System.Security.Claims;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LocalHire.Api.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/notifications")
            .WithTags("Notifications")
            .RequireAuthorization();

        group.MapGet("/", async (
            ClaimsPrincipal principal,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var userId))
                return Results.Unauthorized();

            // ponytail: materialize one user's notifications for SQLite-compatible ordering;
            // add provider-specific pagination when per-user notification volume becomes large.
            var notifications = await db.Notifications
                .AsNoTracking()
                .Where(notification => notification.UserId == userId)
                .ToListAsync(ct);
            var items = notifications
                .OrderByDescending(notification => notification.CreatedAt)
                .Take(100)
                .Select(notification => new NotificationResponse(
                    notification.Id,
                    notification.Type,
                    notification.Title,
                    notification.Message,
                    notification.Link,
                    notification.IsRead,
                    notification.CreatedAt,
                    notification.ReadAt))
                .ToList();
            var unreadCount = notifications.Count(notification => !notification.IsRead);

            return Results.Ok(new NotificationListResponse(items, unreadCount));
        })
        .WithName("GetNotifications");

        group.MapPut("/{id:guid}/read", async (
            Guid id,
            ClaimsPrincipal principal,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var notification = await db.Notifications
                .FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId, ct);
            if (notification is null)
                return Results.NotFound();

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync(ct);
            }

            return Results.Ok(ToResponse(notification));
        })
        .WithName("MarkNotificationRead");

        group.MapPut("/read-all", async (
            ClaimsPrincipal principal,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var unread = await db.Notifications
                .Where(notification => notification.UserId == userId && !notification.IsRead)
                .ToListAsync(ct);
            var readAt = DateTimeOffset.UtcNow;
            foreach (var notification in unread)
            {
                notification.IsRead = true;
                notification.ReadAt = readAt;
            }
            if (unread.Count > 0)
                await db.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("MarkAllNotificationsRead");
    }

    private static NotificationResponse ToResponse(Notification notification) => new(
        notification.Id,
        notification.Type,
        notification.Title,
        notification.Message,
        notification.Link,
        notification.IsRead,
        notification.CreatedAt,
        notification.ReadAt);
}
