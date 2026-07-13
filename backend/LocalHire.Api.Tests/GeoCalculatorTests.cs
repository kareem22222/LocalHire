using LocalHire.Api.Utilities;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class GeoCalculatorTests
{
    [Theory]
    [InlineData(0, 0, true)]
    [InlineData(90, 180, true)]
    [InlineData(-90, -180, true)]
    [InlineData(91, 0, false)]
    [InlineData(0, 181, false)]
    [InlineData(double.NaN, 0, false)]
    public void IsValidCoordinates_checks_ranges_and_finiteness(double lat, double lng, bool expected)
    {
        Assert.Equal(expected, GeoCalculator.IsValidCoordinates(lat, lng));
    }

    [Fact]
    public void GetBoundingBox_at_equator_is_a_finite_padded_window()
    {
        var box = GeoCalculator.GetBoundingBox(0, 0, 50);

        Assert.False(box.CoversAllLongitudes);
        Assert.InRange(box.LngDelta, 0.1, 179.9);

        // The box must be at least as large as the naive (unpadded) circle so it
        // never clips it.
        const double kmPerDegree = 6371 * System.Math.PI / 180.0;
        var naiveLatDelta = 50 / kmPerDegree;
        Assert.True(box.MaxLat >= naiveLatDelta);
        Assert.True(box.MinLat <= -naiveLatDelta);
        Assert.True(box.MaxLng >= naiveLatDelta);
        Assert.True(box.MinLng <= -naiveLatDelta);
    }

    [Fact]
    public void GetBoundingBox_clamps_latitude_and_covers_all_longitudes_near_a_pole()
    {
        var box = GeoCalculator.GetBoundingBox(89.9, 10, 50);

        Assert.Equal(90, box.MaxLat);
        Assert.True(box.CoversAllLongitudes);
        Assert.Equal(180, box.LngDelta);
    }

    [Fact]
    public void GetBoundingBox_covers_all_longitudes_exactly_at_a_pole()
    {
        var box = GeoCalculator.GetBoundingBox(90, 0, 10);

        Assert.Equal(90, box.MaxLat);
        Assert.True(box.CoversAllLongitudes);

        var southBox = GeoCalculator.GetBoundingBox(-90, 0, 10);
        Assert.Equal(-90, southBox.MinLat);
        Assert.True(southBox.CoversAllLongitudes);
    }

    [Fact]
    public void HaversineDistance_returns_max_value_when_target_is_missing()
    {
        Assert.Equal(double.MaxValue, GeoCalculator.HaversineDistance(0, 0, null, 0));
        Assert.Equal(double.MaxValue, GeoCalculator.HaversineDistance(0, 0, 0, null));
    }

    [Fact]
    public void HaversineDistance_measures_one_degree_of_longitude_at_the_equator()
    {
        var distance = GeoCalculator.HaversineDistance(0, 0, 0, 1);
        Assert.InRange(distance, 111.0, 111.4);
    }
}
