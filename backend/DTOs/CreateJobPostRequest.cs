namespace LocalHire.Api.DTOs;

public sealed record CreateJobPostRequest(
    string Title,
    string Description,
    string WorkplaceName,
    string CityArea,
    string? State = null,
    string? Pincode = null,
    double? Latitude = null,
    double? Longitude = null,
    string? EmploymentType = null,
    decimal? SalaryMin = null,
    decimal? SalaryMax = null,
    string? SalaryPeriod = null,
    string? MinEducation = null,
    int? ExperienceMinYears = null,
    int? ExperienceMaxYears = null,
    string? WorkingDays = null,
    string? ShiftStartTime = null,
    string? ShiftEndTime = null,
    int? Openings = null,
    List<string>? RequiredSkills = null,
    List<string>? Languages = null,
    List<string>? Benefits = null
);
