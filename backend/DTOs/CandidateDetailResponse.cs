namespace LocalHire.Api.DTOs;

/// <summary>
/// Employer-facing worker details. Private profile fields such as date of birth,
/// street address, phone number, and precise coordinates are intentionally not
/// part of this discovery contract.
/// </summary>
public sealed record CandidateDetailResponse(
    Guid Id,
    string Name,
    string Email,
    string? Role,
    string? Area,
    string? State,
    string? Pincode,
    DateTimeOffset CreatedAt
);
