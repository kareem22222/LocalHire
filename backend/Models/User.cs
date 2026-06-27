namespace LocalHire.Api.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required UserRole Role { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTimeOffset? LocationUpdatedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<JobPost> JobPosts { get; set; } = new List<JobPost>();
    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
}
