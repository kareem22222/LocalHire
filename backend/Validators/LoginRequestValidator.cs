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
            .NotEmpty();

        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(r => AllowedRoles.Contains(r))
            .WithMessage($"Role must be one of: {string.Join(", ", AllowedRoles)}.");
    }
}
