using FluentValidation;
using LocalHire.Api.DTOs;

namespace LocalHire.Api.Validators;

public sealed class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    private static readonly HashSet<string> EmploymentTypes =
        ["FullTime", "PartTime", "Contract", "Temporary", "Internship", "Daily"];
    private static readonly HashSet<string> Shifts =
        ["Day", "Evening", "Night", "Rotational", "Flexible"];
    private static readonly HashSet<string> WorkModes = ["OnSite", "Hybrid", "Remote"];
    private static readonly HashSet<string> ProficiencyLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];
    private static readonly HashSet<string> LanguageLevels = ["Basic", "Conversational", "Fluent", "Native"];

    public UpdateProfileRequestValidator()
    {
        ConfigurePersonalDetails();
        ConfigureProfessionalDetails();
        ConfigureWorkPreferences();
        ConfigureWorkHistory();
        ConfigureEducationHistory();
        ConfigureSkillsAndLanguages();
        ConfigureCredentials();
    }

    private void ConfigurePersonalDetails()
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

        RuleFor(x => x.Pincode)
            .Matches(@"^\d{6}$")
            .WithMessage("Pincode must be a 6-digit number.")
            .When(x => !string.IsNullOrWhiteSpace(x.Pincode));
    }

    private void ConfigureProfessionalDetails()
    {
        RuleFor(x => x.JobTitle).MaximumLength(100).When(x => !string.IsNullOrWhiteSpace(x.JobTitle));
        RuleFor(x => x.ProfessionalSummary).MaximumLength(1000).When(x => !string.IsNullOrWhiteSpace(x.ProfessionalSummary));
        RuleFor(x => x.ExperienceYears).InclusiveBetween(0, 60).When(x => x.ExperienceYears is not null);
        RuleFor(x => x.Education).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Education));
        RuleForEach(x => x.Skills).NotEmpty().MaximumLength(50);
        RuleForEach(x => x.Languages).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Skills).Must(x => x is null || x.Count <= 20).WithMessage("At most 20 skills are allowed.");
        RuleFor(x => x.Languages).Must(x => x is null || x.Count <= 10).WithMessage("At most 10 languages are allowed.");
    }

    private void ConfigureWorkPreferences()
    {
        RuleFor(x => x.WorkPreferences!.DesiredRoles).Must(values => values.Count <= 10)
            .WithMessage("At most 10 desired roles are allowed.")
            .When(x => x.WorkPreferences is not null);
        RuleForEach(x => x.WorkPreferences!.DesiredRoles).NotEmpty().MaximumLength(100)
            .When(x => x.WorkPreferences is not null);
        RuleForEach(x => x.WorkPreferences!.EmploymentTypes).Must(EmploymentTypes.Contains)
            .WithMessage("Employment type is invalid.").When(x => x.WorkPreferences is not null);
        RuleForEach(x => x.WorkPreferences!.Shifts).Must(Shifts.Contains)
            .WithMessage("Shift is invalid.").When(x => x.WorkPreferences is not null);
        RuleForEach(x => x.WorkPreferences!.WorkModes).Must(WorkModes.Contains)
            .WithMessage("Work mode is invalid.").When(x => x.WorkPreferences is not null);
        RuleFor(x => x.WorkPreferences!.PreferredLocations).Must(values => values.Count <= 10)
            .WithMessage("At most 10 preferred locations are allowed.").When(x => x.WorkPreferences is not null);
        RuleForEach(x => x.WorkPreferences!.PreferredLocations).NotEmpty().MaximumLength(150)
            .When(x => x.WorkPreferences is not null);
        RuleFor(x => x.WorkPreferences!.ExpectedSalaryMin).GreaterThanOrEqualTo(0)
            .When(x => x.WorkPreferences?.ExpectedSalaryMin is not null);
        RuleFor(x => x.WorkPreferences!.ExpectedSalaryMax).GreaterThanOrEqualTo(0)
            .When(x => x.WorkPreferences?.ExpectedSalaryMax is not null);
        RuleFor(x => x.WorkPreferences).Must(preferences =>
                preferences is null || preferences.ExpectedSalaryMin is null ||
                preferences.ExpectedSalaryMax is null ||
                preferences.ExpectedSalaryMax >= preferences.ExpectedSalaryMin)
            .WithMessage("Maximum expected salary must be greater than or equal to minimum expected salary.");
        RuleFor(x => x.WorkPreferences!.SalaryPeriod).Must(value =>
                string.IsNullOrWhiteSpace(value) || value is "Monthly" or "Annual" or "Daily" or "Hourly")
            .WithMessage("Salary period is invalid.").When(x => x.WorkPreferences is not null);
        RuleFor(x => x.WorkPreferences!.Availability).Must(value =>
                string.IsNullOrWhiteSpace(value) || value is "Immediately" or "Within15Days" or "Within30Days" or "ServingNotice" or "Flexible")
            .WithMessage("Availability is invalid.").When(x => x.WorkPreferences is not null);
        RuleFor(x => x.WorkPreferences!.NoticePeriodDays).InclusiveBetween(0, 365)
            .When(x => x.WorkPreferences?.NoticePeriodDays is not null);
        RuleFor(x => x.WorkPreferences!.TravelRadiusKm).InclusiveBetween(1, 500)
            .When(x => x.WorkPreferences?.TravelRadiusKm is not null);
        RuleFor(x => x.WorkPreferences!.VehicleTypes).Must(values => values.Count <= 5)
            .WithMessage("At most 5 vehicle types are allowed.").When(x => x.WorkPreferences is not null);
        RuleForEach(x => x.WorkPreferences!.VehicleTypes).NotEmpty().MaximumLength(50)
            .When(x => x.WorkPreferences is not null);
    }

    private void ConfigureWorkHistory()
    {
        RuleFor(x => x.WorkHistory).Must(values => values is null || values.Count <= 10)
            .WithMessage("At most 10 work-history entries are allowed.");
        RuleForEach(x => x.WorkHistory).ChildRules(entry =>
        {
            entry.RuleFor(x => x.JobTitle).NotEmpty().MaximumLength(100);
            entry.RuleFor(x => x.Employer).NotEmpty().MaximumLength(200);
            entry.RuleFor(x => x.Location).MaximumLength(150).When(x => !string.IsNullOrWhiteSpace(x.Location));
            entry.RuleFor(x => x.Description).MaximumLength(1000).When(x => !string.IsNullOrWhiteSpace(x.Description));
            entry.RuleFor(x => x).Must(x => x.IsCurrent || x.EndDate is null || x.StartDate is null || x.EndDate >= x.StartDate)
                .WithMessage("Work-history end date cannot be before the start date.");
        });
    }

    private void ConfigureEducationHistory()
    {
        RuleFor(x => x.EducationHistory).Must(values => values is null || values.Count <= 10)
            .WithMessage("At most 10 education entries are allowed.");
        RuleForEach(x => x.EducationHistory).ChildRules(entry =>
        {
            entry.RuleFor(x => x.Qualification).NotEmpty().MaximumLength(200);
            entry.RuleFor(x => x.Institution).NotEmpty().MaximumLength(200);
            entry.RuleFor(x => x.FieldOfStudy).MaximumLength(150).When(x => !string.IsNullOrWhiteSpace(x.FieldOfStudy));
            entry.RuleFor(x => x.StartYear).InclusiveBetween(1950, DateTime.UtcNow.Year + 10).When(x => x.StartYear is not null);
            entry.RuleFor(x => x.EndYear).InclusiveBetween(1950, DateTime.UtcNow.Year + 10).When(x => x.EndYear is not null);
            entry.RuleFor(x => x).Must(x => x.StartYear is null || x.EndYear is null || x.EndYear >= x.StartYear)
                .WithMessage("Education end year cannot be before the start year.");
        });
    }

    private void ConfigureSkillsAndLanguages()
    {
        RuleFor(x => x.SkillDetails).Must(values => values is null || values.Count <= 30)
            .WithMessage("At most 30 skills are allowed.");
        RuleForEach(x => x.SkillDetails).ChildRules(entry =>
        {
            entry.RuleFor(x => x.Name).NotEmpty().MaximumLength(50);
            entry.RuleFor(x => x.Proficiency).Must(value => string.IsNullOrWhiteSpace(value) || ProficiencyLevels.Contains(value))
                .WithMessage("Skill proficiency is invalid.");
            entry.RuleFor(x => x.YearsExperience).InclusiveBetween(0, 60).When(x => x.YearsExperience is not null);
        });

        RuleFor(x => x.LanguageDetails).Must(values => values is null || values.Count <= 15)
            .WithMessage("At most 15 languages are allowed.");
        RuleForEach(x => x.LanguageDetails).ChildRules(entry =>
        {
            entry.RuleFor(x => x.Name).NotEmpty().MaximumLength(50);
            entry.RuleFor(x => x.Proficiency).Must(value => string.IsNullOrWhiteSpace(value) || LanguageLevels.Contains(value))
                .WithMessage("Language proficiency is invalid.");
        });
    }

    private void ConfigureCredentials()
    {
        RuleFor(x => x.Credentials).Must(values => values is null || values.Count <= 15)
            .WithMessage("At most 15 credentials are allowed.");
        RuleForEach(x => x.Credentials).ChildRules(entry =>
        {
            entry.RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            entry.RuleFor(x => x.Issuer).NotEmpty().MaximumLength(200);
            entry.RuleFor(x => x.CredentialId).MaximumLength(100).When(x => !string.IsNullOrWhiteSpace(x.CredentialId));
            entry.RuleFor(x => x.Url).MaximumLength(500).Must(IsHttpUrl).When(x => !string.IsNullOrWhiteSpace(x.Url));
            entry.RuleFor(x => x).Must(x => x.IssueDate is null || x.ExpiryDate is null || x.ExpiryDate >= x.IssueDate)
                .WithMessage("Credential expiry date cannot be before the issue date.");
        });
    }

    private static bool IsHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme is "http" or "https" &&
        !string.IsNullOrWhiteSpace(uri.Host);
}
