using FluentValidation;
using LocalHire.Api.DTOs;

namespace LocalHire.Api.Validators;

public sealed class UpdateLocationRequestValidator : AbstractValidator<UpdateLocationRequest>
{
    public UpdateLocationRequestValidator()
    {
        RuleFor(x => x.Latitude)
            .NotNull()
            .WithMessage("Latitude is required.")
            .InclusiveBetween(-90.0, 90.0)
            .WithMessage("Latitude must be between -90 and 90.");

        RuleFor(x => x.Longitude)
            .NotNull()
            .WithMessage("Longitude is required.")
            .InclusiveBetween(-180.0, 180.0)
            .WithMessage("Longitude must be between -180 and 180.");
    }
}
