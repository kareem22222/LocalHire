namespace LocalHire.Api.Models;

public sealed class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public required string Type { get; set; }
    public required string Title { get; set; }
    public required string Message { get; set; }
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }

    public User User { get; set; } = null!;
}
