namespace LocalHire.Api.DTOs;

public sealed record JobPostResponse(
    Guid Id,
    string Title,
    string Description,
    string WorkplaceName,
    string CityArea,
    double? Latitude,
    double? Longitude,
    bool IsActive,
    DateTimeOffset CreatedAt,
    int ApplicationCount
);
