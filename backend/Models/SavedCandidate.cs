namespace LocalHire.Api.Models;

public sealed class SavedCandidate
{
    public Guid Id { get; set; }
    public Guid EmployerId { get; set; }
    public UserRole EmployerRole { get; set; } = UserRole.Hiring;
    public Guid WorkerId { get; set; }
    public UserRole WorkerRole { get; set; } = UserRole.LookingForWork;
    public DateTimeOffset CreatedAt { get; set; }

    public User Employer { get; set; } = null!;
    public User Worker { get; set; } = null!;
}
