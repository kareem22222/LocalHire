using System;
using LocalHire.Api.DTOs;
using LocalHire.Api.Validators;
using Xunit;

namespace LocalHire.Api.Tests.Validators;

public sealed class UpdateProfileRequestValidatorTests
{
    private static readonly UpdateProfileRequestValidator Validator = new();

    // Only Name is required; every other field is optional.
    private static UpdateProfileRequest Valid() => new("Asha Rao", null, null, null, null, null, null, null);

    private static void AssertValid(UpdateProfileRequest request) =>
        Assert.True(Validator.Validate(request).IsValid);

    private static void AssertInvalid(UpdateProfileRequest request, string property)
    {
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == property);
    }

    [Fact]
    public void Accepts_a_name_only_request() => AssertValid(Valid());

    [Fact]
    public void Accepts_a_fully_populated_request() => AssertValid(new UpdateProfileRequest(
        "Asha Rao", "+91 98765 43210", new DateOnly(1995, 5, 20), "Female",
        "12 MG Road", "Indiranagar", "Karnataka", "560038"));

    [Fact]
    public void Rejects_empty_name() => AssertInvalid(Valid() with { Name = "" }, nameof(UpdateProfileRequest.Name));

    [Fact]
    public void Rejects_name_over_100_characters() =>
        AssertInvalid(Valid() with { Name = new string('a', 101) }, nameof(UpdateProfileRequest.Name));

    [Theory]
    [InlineData("12")]          // too short (< 6)
    [InlineData("abcdef")]      // letters not allowed
    [InlineData("98765@43210")] // '@' not allowed
    public void Rejects_malformed_phone(string phone) =>
        AssertInvalid(Valid() with { Phone = phone }, nameof(UpdateProfileRequest.Phone));

    [Fact]
    public void Accepts_well_formed_phone() => AssertValid(Valid() with { Phone = "+91 98765 43210" });

    [Fact]
    public void Rejects_future_date_of_birth() =>
        AssertInvalid(
            Valid() with { DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.Date).AddDays(1) },
            nameof(UpdateProfileRequest.DateOfBirth));

    [Fact]
    public void Accepts_todays_date_of_birth() =>
        AssertValid(Valid() with { DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.Date) });

    [Fact]
    public void Rejects_gender_over_50_characters() =>
        AssertInvalid(Valid() with { Gender = new string('a', 51) }, nameof(UpdateProfileRequest.Gender));

    [Fact]
    public void Rejects_address_line_over_300_characters() =>
        AssertInvalid(Valid() with { AddressLine = new string('a', 301) }, nameof(UpdateProfileRequest.AddressLine));

    [Fact]
    public void Rejects_city_area_over_200_characters() =>
        AssertInvalid(Valid() with { CityArea = new string('a', 201) }, nameof(UpdateProfileRequest.CityArea));

    [Fact]
    public void Rejects_state_over_100_characters() =>
        AssertInvalid(Valid() with { State = new string('a', 101) }, nameof(UpdateProfileRequest.State));

    [Theory]
    [InlineData("12")]
    [InlineData("abcdef")]
    [InlineData("1234567")]
    public void Rejects_malformed_pincode(string pincode) =>
        AssertInvalid(Valid() with { Pincode = pincode }, nameof(UpdateProfileRequest.Pincode));

    [Fact]
    public void Accepts_six_digit_pincode() => AssertValid(Valid() with { Pincode = "560038" });
}
