namespace LocalHire.Api.DTOs;

public sealed record JobApplicationResponse(
    Guid Id,
    Guid JobPostId,
    string JobTitle,
    string WorkplaceName,
    string CityArea,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset StatusUpdatedAt
);
