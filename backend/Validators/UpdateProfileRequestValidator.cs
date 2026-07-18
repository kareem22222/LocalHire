using FluentValidation;
using LocalHire.Api.DTOs;

namespace LocalHire.Api.Validators;

public sealed class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Phone)
            .MaximumLength(30)
            .Matches(@"^[\d+\-()\s]{6,30}$")
            .WithMessage("Phone must contain only digits, spaces, and + - ( ) characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.Phone));

        RuleFor(x => x.DateOfBirth)
            .Must(dob => dob is null || dob.Value <= DateOnly.FromDateTime(DateTime.UtcNow.Date))
            .WithMessage("Date of birth cannot be in the future.");

        RuleFor(x => x.Gender)
            .MaximumLength(50)
            .When(x => !string.IsNullOrWhiteSpace(x.Gender));

        RuleFor(x => x.AddressLine)
            .MaximumLength(300)
            .When(x => !string.IsNullOrWhiteSpace(x.AddressLine));

        RuleFor(x => x.CityArea)
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.CityArea));

        RuleFor(x => x.State)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.State));

        RuleFor(x => x.JobTitle)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.JobTitle));

        RuleFor(x => x.Pincode)
            .Matches(@"^\d{6}$")
            .WithMessage("Pincode must be a 6-digit number.")
            .When(x => !string.IsNullOrWhiteSpace(x.Pincode));
    }
}
