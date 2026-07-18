namespace LocalHire.Api.DTOs;

/// <summary>
/// A worker surfaced to a hiring employer in the "Talent near your business"
/// list. Only the worker's approximate, user-entered area is exposed; precise
/// coordinates remain server-side and are used only to calculate distance.
/// </summary>
public sealed record CandidateResponse(
    Guid Id,
    string Name,
    string? Role,
    string? Area,
    string? State,
    string? Pincode,
    double? DistanceKm,
    int MatchScore
);
