namespace LocalHire.Api.DTOs;

public sealed record UpdateProfileRequest(
    string Name,
    string? Phone,
    DateOnly? DateOfBirth,
    string? Gender,
    string? AddressLine,
    string? CityArea,
    string? State,
    string? Pincode
);
