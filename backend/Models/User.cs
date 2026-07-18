namespace LocalHire.Api.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required UserRole Role { get; set; }

    // Profile details (all optional; populated via the profile-update endpoint)
    public string? Phone { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }

    /// <summary>
    /// The kind of work a worker does (e.g. "Delivery Partner"). Used to power the
    /// employer's talent search by role. Not meaningful for hiring accounts.
    /// </summary>
    public string? JobTitle { get; set; }
    public string? ProfessionalSummary { get; set; }
    public int? ExperienceYears { get; set; }
    public string? Education { get; set; }
    public List<string> Skills { get; set; } = [];
    public List<string> Languages { get; set; } = [];
    public string? ResumeKey { get; set; }
    public string? ResumeFileName { get; set; }

    public string? AddressLine { get; set; }
    public string? CityArea { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTimeOffset? LocationUpdatedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<JobPost> JobPosts { get; set; } = new List<JobPost>();
    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
}
