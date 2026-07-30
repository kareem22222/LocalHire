namespace LocalHire.Api.Models;

public sealed class SavedCandidate
{
    public Guid Id { get; set; }
    public Guid EmployerId { get; set; }
    public Guid WorkerId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User Employer { get; set; } = null!;
    public User Worker { get; set; } = null!;
}
