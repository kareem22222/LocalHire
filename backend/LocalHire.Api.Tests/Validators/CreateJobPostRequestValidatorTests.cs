using System.Linq;
using LocalHire.Api.DTOs;
using LocalHire.Api.Validators;
using Xunit;

namespace LocalHire.Api.Tests.Validators;

public sealed class CreateJobPostRequestValidatorTests
{
    private static readonly CreateJobPostRequestValidator Validator = new();

    // Minimal request with only the required fields populated.
    private static CreateJobPostRequest Valid() => new("Cashier", "Front desk", "Corner Shop", "Bandra");

    private static void AssertValid(CreateJobPostRequest request) =>
        Assert.True(Validator.Validate(request).IsValid);

    private static void AssertInvalid(CreateJobPostRequest request, string property)
    {
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == property);
    }

    [Fact]
    public void Accepts_minimal_required_fields() => AssertValid(Valid());

    [Fact]
    public void Accepts_a_fully_populated_request() => AssertValid(Valid() with
    {
        State = "Maharashtra",
        Pincode = "400050",
        Latitude = 19.05,
        Longitude = 72.83,
        EmploymentType = "FullTime",
        SalaryMin = 15000m,
        SalaryMax = 25000m,
        SalaryPeriod = "Monthly",
        MinEducation = "10th pass",
        ExperienceMinYears = 1,
        ExperienceMaxYears = 3,
        WorkingDays = "Mon-Sat",
        ShiftStartTime = "09:00",
        ShiftEndTime = "18:00",
        Openings = 2,
        RequiredSkills = new List<string> { "Billing" },
        Languages = new List<string> { "Hindi" },
        Benefits = new List<string> { "PF" },
    });

    [Fact]
    public void Rejects_empty_title() => AssertInvalid(Valid() with { Title = "" }, nameof(CreateJobPostRequest.Title));

    [Fact]
    public void Rejects_title_over_200_characters() =>
        AssertInvalid(Valid() with { Title = new string('a', 201) }, nameof(CreateJobPostRequest.Title));

    [Fact]
    public void Rejects_empty_description() =>
        AssertInvalid(Valid() with { Description = "" }, nameof(CreateJobPostRequest.Description));

    [Fact]
    public void Rejects_description_over_2000_characters() =>
        AssertInvalid(Valid() with { Description = new string('a', 2001) }, nameof(CreateJobPostRequest.Description));

    [Fact]
    public void Rejects_empty_workplace_name() =>
        AssertInvalid(Valid() with { WorkplaceName = "" }, nameof(CreateJobPostRequest.WorkplaceName));

    [Fact]
    public void Rejects_empty_city_area() =>
        AssertInvalid(Valid() with { CityArea = "" }, nameof(CreateJobPostRequest.CityArea));

    [Fact]
    public void Rejects_state_over_100_characters() =>
        AssertInvalid(Valid() with { State = new string('a', 101) }, nameof(CreateJobPostRequest.State));

    [Theory]
    [InlineData("12")]
    [InlineData("abcdef")]
    [InlineData("1234567")]
    public void Rejects_malformed_pincode(string pincode) =>
        AssertInvalid(Valid() with { Pincode = pincode }, nameof(CreateJobPostRequest.Pincode));

    [Fact]
    public void Accepts_six_digit_pincode() => AssertValid(Valid() with { Pincode = "400050" });

    [Fact]
    public void Rejects_latitude_without_longitude() =>
        AssertInvalid(Valid() with { Latitude = 19.0 }, nameof(CreateJobPostRequest.Longitude));

    [Fact]
    public void Rejects_longitude_without_latitude() =>
        AssertInvalid(Valid() with { Longitude = 72.0 }, nameof(CreateJobPostRequest.Latitude));

    [Fact]
    public void Rejects_out_of_range_latitude() =>
        AssertInvalid(Valid() with { Latitude = 91.0, Longitude = 0.0 }, nameof(CreateJobPostRequest.Latitude));

    [Fact]
    public void Rejects_out_of_range_longitude() =>
        AssertInvalid(Valid() with { Latitude = 0.0, Longitude = 181.0 }, nameof(CreateJobPostRequest.Longitude));

    [Fact]
    public void Rejects_unknown_employment_type() =>
        AssertInvalid(Valid() with { EmploymentType = "Banana" }, nameof(CreateJobPostRequest.EmploymentType));

    [Fact]
    public void Rejects_unknown_salary_period() =>
        AssertInvalid(Valid() with { SalaryPeriod = "Fortnightly" }, nameof(CreateJobPostRequest.SalaryPeriod));

    [Fact]
    public void Requires_salary_period_when_a_salary_amount_is_present() =>
        AssertInvalid(Valid() with { SalaryMin = 15000m }, nameof(CreateJobPostRequest.SalaryPeriod));

    [Fact]
    public void Rejects_negative_salary() =>
        AssertInvalid(Valid() with { SalaryMin = -1m, SalaryPeriod = "Monthly" }, nameof(CreateJobPostRequest.SalaryMin));

    [Fact]
    public void Rejects_max_salary_below_min_salary() =>
        AssertInvalid(Valid() with { SalaryMin = 20000m, SalaryMax = 10000m, SalaryPeriod = "Monthly" },
            nameof(CreateJobPostRequest.SalaryMax));

    [Fact]
    public void Rejects_experience_above_60_years() =>
        AssertInvalid(Valid() with { ExperienceMinYears = 61 }, nameof(CreateJobPostRequest.ExperienceMinYears));

    [Fact]
    public void Rejects_max_experience_below_min_experience() =>
        AssertInvalid(Valid() with { ExperienceMinYears = 5, ExperienceMaxYears = 2 },
            nameof(CreateJobPostRequest.ExperienceMaxYears));

    [Theory]
    [InlineData("9am")]
    [InlineData("25:00")]
    [InlineData("noon")]
    public void Rejects_malformed_shift_start_time(string time) =>
        AssertInvalid(Valid() with { ShiftStartTime = time }, nameof(CreateJobPostRequest.ShiftStartTime));

    [Theory]
    [InlineData("09:00")]
    [InlineData("18:00:00")]
    public void Accepts_well_formed_shift_times(string time) =>
        AssertValid(Valid() with { ShiftStartTime = time, ShiftEndTime = time });

    [Theory]
    [InlineData(0)]
    [InlineData(10001)]
    public void Rejects_openings_out_of_range(int openings) =>
        AssertInvalid(Valid() with { Openings = openings }, nameof(CreateJobPostRequest.Openings));

    [Fact]
    public void Rejects_blank_required_skill_entries() =>
        AssertInvalid(Valid() with { RequiredSkills = new List<string> { "" } }, "RequiredSkills[0]");

    [Fact]
    public void Rejects_required_skill_over_60_characters() =>
        AssertInvalid(Valid() with { RequiredSkills = new List<string> { new string('x', 61) } }, "RequiredSkills[0]");

    [Fact]
    public void Rejects_more_than_30_required_skills() =>
        AssertInvalid(
            Valid() with { RequiredSkills = Enumerable.Range(0, 31).Select(i => $"skill{i}").ToList() },
            "RequiredSkills.Count");

    [Fact]
    public void Rejects_more_than_20_languages() =>
        AssertInvalid(
            Valid() with { Languages = Enumerable.Range(0, 21).Select(i => $"lang{i}").ToList() },
            "Languages.Count");

    [Fact]
    public void Rejects_more_than_30_benefits() =>
        AssertInvalid(
            Valid() with { Benefits = Enumerable.Range(0, 31).Select(i => $"benefit{i}").ToList() },
            "Benefits.Count");
}
