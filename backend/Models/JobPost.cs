namespace LocalHire.Api.Models;

public sealed class JobPost
{
    public Guid Id { get; set; }
    public Guid EmployerId { get; set; }
    public UserRole EmployerRole { get; set; } = UserRole.Hiring;
    public required string Title { get; set; }
    public required string Description { get; set; }
    public required string WorkplaceName { get; set; }
    public required string CityArea { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }

    public User Employer { get; set; } = null!;
    public ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();
}
