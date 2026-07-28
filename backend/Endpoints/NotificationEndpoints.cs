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
            int? skip,
            ClaimsPrincipal principal,
            LocalHireDbContext db,
            CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var offset = Math.Max(skip ?? 0, 0);
            var query = db.Notifications
                .AsNoTracking()
                .Where(notification => notification.UserId == userId);
            var items = db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite"
                ? (await query.ToListAsync(ct))
                    .OrderByDescending(notification => notification.CreatedAt)
                    .Skip(offset)
                    .Take(100)
                    .Select(ToResponse)
                    .ToList()
                : await query
                    .OrderByDescending(notification => notification.CreatedAt)
                    .Skip(offset)
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
                    .ToListAsync(ct);
            var unreadCount = await db.Notifications
                .CountAsync(notification => notification.UserId == userId && !notification.IsRead, ct);

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

            var readAt = DateTimeOffset.UtcNow;
            await db.Notifications
                .Where(notification => notification.UserId == userId && !notification.IsRead)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(notification => notification.IsRead, true)
                    .SetProperty(notification => notification.ReadAt, readAt), ct);

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
