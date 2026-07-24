using System.Text.Json.Serialization;
using LocalHire.Api.Models;

namespace LocalHire.Api.DTOs;

public sealed record UserProfile(
    Guid Id,
    string Name,
    string Email,
    [property: JsonConverter(typeof(JsonStringEnumConverter))]
    UserRole Role,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Gender,
    string? AddressLine,
    string? CityArea,
    string? State,
    string? Pincode,
    double? Latitude,
    double? Longitude,
    DateTimeOffset? LocationUpdatedAt,
    DateTimeOffset CreatedAt,
    string? JobTitle,
    string? ProfessionalSummary,
    int? ExperienceYears,
    string? Education,
    IReadOnlyList<string> Skills,
    IReadOnlyList<string> Languages,
    WorkerPreferences WorkPreferences,
    IReadOnlyList<WorkExperienceEntry> WorkHistory,
    IReadOnlyList<EducationEntry> EducationHistory,
    IReadOnlyList<SkillProfile> SkillDetails,
    IReadOnlyList<LanguageProfile> LanguageDetails,
    IReadOnlyList<CredentialEntry> Credentials,
    string? ResumeFileName,
    bool IsProfileComplete,
    int ProfileCompletionPercent
);
