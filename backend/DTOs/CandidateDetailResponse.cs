using LocalHire.Api.Models;

namespace LocalHire.Api.DTOs;

/// <summary>
/// Detail for a single worker on the employer-facing candidate page. Contact,
/// resume, and credential data are available only when <see cref="HasApplied"/>
/// is true. The worker's phone number is never included.
/// </summary>
public sealed record CandidateDetailResponse(
    Guid Id,
    string Name,
    string? Email,
    bool HasApplied,
    string? Role,
    string? Gender,
    DateOnly? DateOfBirth,
    string? AddressLine,
    string? Area,
    string? State,
    string? Pincode,
    double? Latitude,
    double? Longitude,
    DateTimeOffset CreatedAt,
    string? ProfessionalSummary = null,
    int? ExperienceYears = null,
    string? Education = null,
    IReadOnlyList<string>? Skills = null,
    IReadOnlyList<string>? Languages = null,
    bool HasResume = false,
    WorkerPreferences? WorkPreferences = null,
    IReadOnlyList<WorkExperienceEntry>? WorkHistory = null,
    IReadOnlyList<EducationEntry>? EducationHistory = null,
    IReadOnlyList<SkillProfile>? SkillDetails = null,
    IReadOnlyList<LanguageProfile>? LanguageDetails = null,
    IReadOnlyList<CredentialEntry>? Credentials = null
);
