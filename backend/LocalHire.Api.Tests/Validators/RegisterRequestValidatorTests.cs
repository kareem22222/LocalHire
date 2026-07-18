using LocalHire.Api.DTOs;
using LocalHire.Api.Validators;
using Xunit;

namespace LocalHire.Api.Tests.Validators;

public sealed class RegisterRequestValidatorTests
{
    private static readonly RegisterRequestValidator Validator = new();

    private static RegisterRequest Valid() => new("Priya Rao", "priya@example.com", "Password1!", "Hiring");

    private static void AssertInvalid(RegisterRequest request, string property)
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

    [Fact]
    public void Rejects_empty_name() => AssertInvalid(Valid() with { Name = "" }, nameof(RegisterRequest.Name));

    [Fact]
    public void Rejects_name_over_100_characters() =>
        AssertInvalid(Valid() with { Name = new string('a', 101) }, nameof(RegisterRequest.Name));

    [Theory]
    [InlineData("")]
    [InlineData("plainaddress")]
    [InlineData("no-at-symbol.com")]
    public void Rejects_invalid_email(string email) =>
        AssertInvalid(Valid() with { Email = email }, nameof(RegisterRequest.Email));

    [Fact]
    public void Rejects_email_over_256_characters() =>
        AssertInvalid(Valid() with { Email = new string('a', 250) + "@example.com" }, nameof(RegisterRequest.Email));

    [Theory]
    [InlineData("")]                 // empty
    [InlineData("Pass1!")]           // shorter than 8
    [InlineData("password1!")]       // no uppercase
    [InlineData("PASSWORD1!")]       // no lowercase
    [InlineData("Password!!")]       // no digit
    [InlineData("Password11")]       // no special character
    public void Rejects_weak_password(string password) =>
        AssertInvalid(Valid() with { Password = password }, nameof(RegisterRequest.Password));

    [Fact]
    public void Rejects_password_over_72_utf8_bytes() =>
        AssertInvalid(Valid() with { Password = "Aa1!" + new string('é', 35) }, nameof(RegisterRequest.Password));

    [Theory]
    [InlineData("")]
    [InlineData("Boss")]
    [InlineData("admin")]
    public void Rejects_unknown_role(string role) =>
        AssertInvalid(Valid() with { Role = role }, nameof(RegisterRequest.Role));
}
