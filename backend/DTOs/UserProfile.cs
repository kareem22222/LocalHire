using LocalHire.Api.Models;

namespace LocalHire.Api.DTOs;

public sealed record UserProfile(Guid Id, string Name, string Email, UserRole Role, DateTimeOffset CreatedAt);
