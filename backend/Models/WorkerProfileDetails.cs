namespace LocalHire.Api.Models;

public sealed class WorkerPreferences
{
    public List<string> DesiredRoles { get; set; } = [];
    public List<string> EmploymentTypes { get; set; } = [];
    public List<string> Shifts { get; set; } = [];
    public List<string> WorkModes { get; set; } = [];
    public List<string> PreferredLocations { get; set; } = [];
    public decimal? ExpectedSalaryMin { get; set; }
    public decimal? ExpectedSalaryMax { get; set; }
    public string? SalaryPeriod { get; set; }
    public string? Availability { get; set; }
    public int? NoticePeriodDays { get; set; }
    public int? TravelRadiusKm { get; set; }
    public bool? WillingToRelocate { get; set; }
    public bool? CanWorkWeekends { get; set; }
    public bool? OwnsVehicle { get; set; }
    public List<string> VehicleTypes { get; set; } = [];
}

public sealed class WorkExperienceEntry
{
    public string JobTitle { get; set; } = string.Empty;
    public string Employer { get; set; } = string.Empty;
    public string? Location { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public string? Description { get; set; }
}

public sealed class EducationEntry
{
    public string Qualification { get; set; } = string.Empty;
    public string Institution { get; set; } = string.Empty;
    public string? FieldOfStudy { get; set; }
    public int? StartYear { get; set; }
    public int? EndYear { get; set; }
}

public sealed class SkillProfile
{
    public string Name { get; set; } = string.Empty;
    public string? Proficiency { get; set; }
    public int? YearsExperience { get; set; }
}

public sealed class LanguageProfile
{
    public string Name { get; set; } = string.Empty;
    public string? Proficiency { get; set; }
    public bool CanSpeak { get; set; } = true;
    public bool CanRead { get; set; }
    public bool CanWrite { get; set; }
}

public sealed class CredentialEntry
{
    public string Name { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public DateOnly? IssueDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public string? CredentialId { get; set; }
    public string? Url { get; set; }
}
