namespace LocalHire.Api.Models;

public sealed class SavedJob
{
    public Guid Id { get; set; }
    public Guid WorkerId { get; set; }
    public Guid JobPostId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User Worker { get; set; } = null!;
    public JobPost JobPost { get; set; } = null!;
}
