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
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // Role details
    public EmploymentType? EmploymentType { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public SalaryPeriod? SalaryPeriod { get; set; }
    public string? MinEducation { get; set; }
    public int? ExperienceMinYears { get; set; }
    public int? ExperienceMaxYears { get; set; }
    public string? WorkingDays { get; set; }
    public TimeOnly? ShiftStartTime { get; set; }
    public TimeOnly? ShiftEndTime { get; set; }
    public int? Openings { get; set; }
    public List<string> RequiredSkills { get; set; } = new();
    public List<string> Languages { get; set; } = new();
    public List<string> Benefits { get; set; } = new();

    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }

    public User Employer { get; set; } = null!;
    public ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();
}
