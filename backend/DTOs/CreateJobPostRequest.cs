namespace LocalHire.Api.DTOs;

public sealed record CreateJobPostRequest(
    string Title,
    string Description,
    string WorkplaceName,
    string CityArea,
    double? Latitude,
    double? Longitude
);
