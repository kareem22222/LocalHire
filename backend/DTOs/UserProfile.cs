using System.Text.Json.Serialization;
using LocalHire.Api.Models;

namespace LocalHire.Api.DTOs;

public sealed record UserProfile(
    Guid Id,
    string Name,
    string Email,
    [property: JsonConverter(typeof(JsonStringEnumConverter))]
    UserRole Role,
    double? Latitude,
    double? Longitude,
    DateTimeOffset? LocationUpdatedAt,
    DateTimeOffset CreatedAt
);
