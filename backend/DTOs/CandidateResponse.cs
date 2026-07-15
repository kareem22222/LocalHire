namespace LocalHire.Api.DTOs;

/// <summary>
/// A worker surfaced to a hiring employer in the "Talent near your business"
/// list. Location fields come straight from the worker's profile; <see
/// cref="DistanceKm"/> and <see cref="MatchScore"/> are computed relative to the
/// employer's search origin (their coordinates or a supplied point). Distance is
/// null when either side has no coordinates.
/// </summary>
public sealed record CandidateResponse(
    Guid Id,
    string Name,
    string? Role,
    string? Area,
    string? State,
    string? Pincode,
    double? Latitude,
    double? Longitude,
    double? DistanceKm,
    int MatchScore
);
