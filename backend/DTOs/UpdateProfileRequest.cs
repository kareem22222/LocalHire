using LocalHire.Api.Models;

namespace LocalHire.Api.DTOs;

public sealed record UpdateProfileRequest(
    string Name,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Gender,
    string? AddressLine,
    string? CityArea,
    string? State,
    string? Pincode,
    string? JobTitle = null,
    string? ProfessionalSummary = null,
    int? ExperienceYears = null,
    string? Education = null,
    List<string>? Skills = null,
    List<string>? Languages = null,
    WorkerPreferences? WorkPreferences = null,
    List<WorkExperienceEntry>? WorkHistory = null,
    List<EducationEntry>? EducationHistory = null,
    List<SkillProfile>? SkillDetails = null,
    List<LanguageProfile>? LanguageDetails = null,
    List<CredentialEntry>? Credentials = null
);
