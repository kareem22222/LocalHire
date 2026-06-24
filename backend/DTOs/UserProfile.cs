namespace LocalHire.Api.DTOs;

public sealed record UserProfile(Guid Id, string Name, string Email, DateTimeOffset CreatedAt);
