using LocalHire.Api.DTOs;
using LocalHire.Api.Validators;
using Xunit;

namespace LocalHire.Api.Tests.Validators;

public sealed class LoginRequestValidatorTests
{
    private static readonly LoginRequestValidator Validator = new();

    private static LoginRequest Valid() => new("priya@example.com", "Password1!", "Hiring");

    private static void AssertInvalid(LoginRequest request, string property)
    {
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == property);
    }

    [Theory]
    [InlineData("Hiring")]
    [InlineData("LookingForWork")]
    public void Accepts_a_well_formed_request(string role)
    {
        Assert.True(Validator.Validate(Valid() with { Role = role }).IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("plainaddress")]
    public void Rejects_invalid_email(string email) =>
        AssertInvalid(Valid() with { Email = email }, nameof(LoginRequest.Email));

    [Fact]
    public void Rejects_empty_password() =>
        AssertInvalid(Valid() with { Password = "" }, nameof(LoginRequest.Password));

    [Fact]
    public void Rejects_password_over_72_utf8_bytes() =>
        AssertInvalid(Valid() with { Password = "Aa1!" + new string('é', 35) }, nameof(LoginRequest.Password));

    [Theory]
    [InlineData("")]
    [InlineData("Boss")]
    public void Rejects_unknown_role(string role) =>
        AssertInvalid(Valid() with { Role = role }, nameof(LoginRequest.Role));

    [Fact]
    public void Accepts_any_non_empty_password_without_strength_rules()
    {
        // Login must not enforce the registration password policy.
        Assert.True(Validator.Validate(Valid() with { Password = "weak" }).IsValid);
    }
}
