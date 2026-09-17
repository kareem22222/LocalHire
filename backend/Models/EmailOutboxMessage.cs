namespace LocalHire.Api.Models;

public sealed class EmailOutboxMessage
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public required string DedupeKey { get; set; }
    public required string Subject { get; set; }
    public required string Body { get; set; }
    public string? Link { get; set; }
    public int Attempts { get; set; }
    public DateTimeOffset NextAttemptAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public string? LastError { get; set; }

    public User User { get; set; } = null!;
}
