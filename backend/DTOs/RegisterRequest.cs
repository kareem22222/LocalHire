namespace LocalHire.Api.DTOs;

public sealed record RegisterRequest(string Name, string Email, string Password, string Role);
