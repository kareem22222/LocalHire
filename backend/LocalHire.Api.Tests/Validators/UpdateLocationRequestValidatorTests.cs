using LocalHire.Api.DTOs;
using LocalHire.Api.Validators;
using Xunit;

namespace LocalHire.Api.Tests.Validators;

public sealed class UpdateLocationRequestValidatorTests
{
    private static readonly UpdateLocationRequestValidator Validator = new();

    private static void AssertValid(UpdateLocationRequest request) =>
        Assert.True(Validator.Validate(request).IsValid);

    private static void AssertInvalid(UpdateLocationRequest request, string property)
    {
        var result = Validator.Validate(request);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == property);
    }

    [Theory]
    [InlineData(0.0, 0.0)]
    [InlineData(-90.0, -180.0)]
    [InlineData(90.0, 180.0)]
    [InlineData(12.971, 77.641)]
    public void Accepts_coordinates_within_range(double lat, double lng) =>
        AssertValid(new UpdateLocationRequest(lat, lng));

    [Fact]
    public void Rejects_missing_latitude() =>
        AssertInvalid(new UpdateLocationRequest(null, 0.0), nameof(UpdateLocationRequest.Latitude));

    [Fact]
    public void Rejects_missing_longitude() =>
        AssertInvalid(new UpdateLocationRequest(0.0, null), nameof(UpdateLocationRequest.Longitude));

    [Theory]
    [InlineData(91.0)]
    [InlineData(-91.0)]
    public void Rejects_out_of_range_latitude(double lat) =>
        AssertInvalid(new UpdateLocationRequest(lat, 0.0), nameof(UpdateLocationRequest.Latitude));

    [Theory]
    [InlineData(181.0)]
    [InlineData(-181.0)]
    public void Rejects_out_of_range_longitude(double lng) =>
        AssertInvalid(new UpdateLocationRequest(0.0, lng), nameof(UpdateLocationRequest.Longitude));
}
