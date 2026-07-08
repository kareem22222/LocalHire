using FluentValidation;
using LocalHire.Api.DTOs;

namespace LocalHire.Api.Validators;

public sealed class CreateJobPostRequestValidator : AbstractValidator<CreateJobPostRequest>
{
    public CreateJobPostRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Description)
            .NotEmpty()
            .MaximumLength(2000);

        RuleFor(x => x.WorkplaceName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.CityArea)
            .NotEmpty()
            .MaximumLength(200);

        // If one coordinate is supplied, require both
        RuleFor(x => x.Latitude)
            .NotNull()
            .InclusiveBetween(-90.0, 90.0)
            .When(x => x.Longitude is not null);

        RuleFor(x => x.Longitude)
            .NotNull()
            .InclusiveBetween(-180.0, 180.0)
            .When(x => x.Latitude is not null);
    }
}
