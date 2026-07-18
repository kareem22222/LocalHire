namespace LocalHire.Api.DTOs;

/// <summary>
/// Full detail for a single worker, shown on the employer-facing candidate detail
/// page. Includes every profile field an employer may need to make a decision
/// EXCEPT the worker's phone number, which is intentionally withheld from the
/// default view. The <see cref="Email"/> is only used to power the explicit
/// "Contact" action on the detail page.
/// </summary>
public sealed record CandidateDetailResponse(
    Guid Id,
    string Name,
    string Email,
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
    bool HasResume = false
);
