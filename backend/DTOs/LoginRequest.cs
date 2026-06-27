namespace LocalHire.Api.DTOs;

public sealed record LoginRequest(string Email, string Password, string Role);
