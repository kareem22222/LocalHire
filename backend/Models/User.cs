namespace LocalHire.Api.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required UserRole Role { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
