using System.Globalization;
using FluentValidation;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;

namespace LocalHire.Api.Validators;

public sealed class CreateJobPostRequestValidator : AbstractValidator<CreateJobPostRequest>
{
    private static readonly string[] EmploymentTypes = Enum.GetNames<EmploymentType>();
    private static readonly string[] SalaryPeriods = Enum.GetNames<SalaryPeriod>();

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

        RuleFor(x => x.State)
            .MaximumLength(100)
            .When(x => !string.IsNullOrWhiteSpace(x.State));

        RuleFor(x => x.Pincode)
            .Matches(@"^\d{6}$")
            .WithMessage("Pincode must be a 6-digit number.")
            .When(x => !string.IsNullOrWhiteSpace(x.Pincode));

        // If one coordinate is supplied, require both
        RuleFor(x => x.Latitude)
            .NotNull()
            .InclusiveBetween(-90.0, 90.0)
            .When(x => x.Longitude is not null);

        RuleFor(x => x.Longitude)
            .NotNull()
            .InclusiveBetween(-180.0, 180.0)
            .When(x => x.Latitude is not null);

        // --- Role details ---

        RuleFor(x => x.EmploymentType)
            .Must(v => EmploymentTypes.Contains(v))
            .WithMessage($"Employment type must be one of: {string.Join(", ", EmploymentTypes)}.")
            .When(x => !string.IsNullOrWhiteSpace(x.EmploymentType));

        RuleFor(x => x.SalaryPeriod)
            .Must(v => SalaryPeriods.Contains(v))
            .WithMessage($"Salary period must be one of: {string.Join(", ", SalaryPeriods)}.")
            .When(x => !string.IsNullOrWhiteSpace(x.SalaryPeriod));

        RuleFor(x => x.SalaryMin)
            .GreaterThanOrEqualTo(0)
            .When(x => x.SalaryMin is not null);

        RuleFor(x => x.SalaryMax)
            .GreaterThanOrEqualTo(0)
            .When(x => x.SalaryMax is not null);

        RuleFor(x => x.SalaryMax)
            .GreaterThanOrEqualTo(x => x.SalaryMin!.Value)
            .WithMessage("Maximum salary must be greater than or equal to minimum salary.")
            .When(x => x.SalaryMin is not null && x.SalaryMax is not null);

        RuleFor(x => x.SalaryPeriod)
            .NotEmpty()
            .WithMessage("Salary period is required when a salary amount is provided.")
            .When(x => x.SalaryMin is not null || x.SalaryMax is not null);

        RuleFor(x => x.ExperienceMinYears)
            .InclusiveBetween(0, 60)
            .When(x => x.ExperienceMinYears is not null);

        RuleFor(x => x.ExperienceMaxYears)
            .InclusiveBetween(0, 60)
            .When(x => x.ExperienceMaxYears is not null);

        RuleFor(x => x.ExperienceMaxYears)
            .GreaterThanOrEqualTo(x => x.ExperienceMinYears!.Value)
            .WithMessage("Maximum experience must be greater than or equal to minimum experience.")
            .When(x => x.ExperienceMinYears is not null && x.ExperienceMaxYears is not null);

        RuleFor(x => x.MinEducation)
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.MinEducation));

        RuleFor(x => x.WorkingDays)
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.WorkingDays));

        RuleFor(x => x.ShiftStartTime)
            .Must(BeAValidTime)
            .WithMessage("Shift start time must be in HH:mm format.")
            .When(x => !string.IsNullOrWhiteSpace(x.ShiftStartTime));

        RuleFor(x => x.ShiftEndTime)
            .Must(BeAValidTime)
            .WithMessage("Shift end time must be in HH:mm format.")
            .When(x => !string.IsNullOrWhiteSpace(x.ShiftEndTime));

        RuleFor(x => x.Openings)
            .InclusiveBetween(1, 10000)
            .When(x => x.Openings is not null);

        RuleForEach(x => x.RequiredSkills).NotEmpty().MaximumLength(60);
        RuleFor(x => x.RequiredSkills!.Count)
            .LessThanOrEqualTo(30)
            .WithMessage("A maximum of 30 skills is allowed.")
            .When(x => x.RequiredSkills is not null);

        RuleForEach(x => x.Languages).NotEmpty().MaximumLength(40);
        RuleFor(x => x.Languages!.Count)
            .LessThanOrEqualTo(20)
            .WithMessage("A maximum of 20 languages is allowed.")
            .When(x => x.Languages is not null);

        RuleForEach(x => x.Benefits).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Benefits!.Count)
            .LessThanOrEqualTo(30)
            .WithMessage("A maximum of 30 benefits is allowed.")
            .When(x => x.Benefits is not null);
    }

    private static bool BeAValidTime(string? value) =>
        TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _) ||
        TimeOnly.TryParseExact(value, "HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}
