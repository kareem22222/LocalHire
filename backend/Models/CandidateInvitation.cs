namespace LocalHire.Api.Models;

public enum InvitationStatus
{
    Pending,
    Accepted,
    Declined
}

public sealed class CandidateInvitation
{
    public Guid Id { get; set; }
    public Guid EmployerId { get; set; }
    public Guid WorkerId { get; set; }
    public Guid JobPostId { get; set; }
    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }

    public User Employer { get; set; } = null!;
    public User Worker { get; set; } = null!;
    public JobPost JobPost { get; set; } = null!;
}
