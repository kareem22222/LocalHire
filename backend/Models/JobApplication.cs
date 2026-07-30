using System.ComponentModel.DataAnnotations;

namespace LocalHire.Api.Models;

public sealed class JobApplication
{
    public Guid Id { get; set; }
    public Guid JobPostId { get; set; }
    public Guid WorkerId { get; set; }
    public UserRole WorkerRole { get; set; } = UserRole.LookingForWork;
    [ConcurrencyCheck]
    public ApplicationStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? StatusUpdatedAt { get; set; }

    public JobPost JobPost { get; set; } = null!;
    public User Worker { get; set; } = null!;
}
