namespace LocalHire.Api.DTOs;

public sealed record NotificationResponse(
    Guid Id,
    string Type,
    string Title,
    string Message,
    string? Link,
    bool IsRead,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt);

public sealed record NotificationListResponse(
    IReadOnlyList<NotificationResponse> Items,
    int UnreadCount);
