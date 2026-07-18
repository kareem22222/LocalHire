using System.Text;
using FluentValidation;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;

namespace LocalHire.Api.Validators;

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    private static readonly string[] AllowedRoles = Enum.GetNames<UserRole>();

    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(x => x.Password)
            .NotEmpty()
            .Must(password => password is null || Encoding.UTF8.GetByteCount(password) <= 72)
            .WithMessage("Password must be at most 72 UTF-8 bytes.");

        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(r => AllowedRoles.Contains(r))
            .WithMessage($"Role must be one of: {string.Join(", ", AllowedRoles)}.");
    }
}
