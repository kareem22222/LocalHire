namespace LocalHire.Api.Utilities;

/// <summary>
/// Pure geospatial helpers. Kept free of EF/HTTP concerns so they can be unit
/// tested in isolation and reused wherever coordinate math is needed.
/// </summary>
public static class GeoCalculator
{
    private const double EarthRadiusKm = 6371;
    private const double KmPerLatitudeDegree = 111.32;

    /// <summary>
    /// An axis-aligned latitude/longitude window used as a cheap SQL pre-filter
    /// before the exact great-circle distance is applied. <see cref="LngDelta"/>
    /// is exposed so callers can detect the pole case (a full 180° longitude
    /// span) and skip longitude filtering entirely.
    /// </summary>
    public readonly record struct BoundingBox(
        double MinLat, double MaxLat, double MinLng, double MaxLng, double LngDelta)
    {
        /// <summary>True when the box spans every longitude (near the poles).</summary>
        public bool CoversAllLongitudes => LngDelta >= 180;
    }

    /// <summary>
    /// Computes the bounding box that contains every point within
    /// <paramref name="radiusKm"/> of the given coordinate. Pure math with no EF
    /// or HTTP dependencies so it can be unit tested and reused.
    /// </summary>
    public static BoundingBox GetBoundingBox(double lat, double lng, double radiusKm)
    {
        var latDelta = radiusKm / KmPerLatitudeDegree;
        var minLat = Math.Max(-90, lat - latDelta);
        var maxLat = Math.Min(90, lat + latDelta);
        var cosLat = Math.Cos(lat * Math.PI / 180);
        var lngDelta = Math.Abs(cosLat) < 0.000001
            ? 180
            : radiusKm / (KmPerLatitudeDegree * Math.Abs(cosLat));
        var minLng = lng - lngDelta;
        var maxLng = lng + lngDelta;
        return new BoundingBox(minLat, maxLat, minLng, maxLng, lngDelta);
    }

    public static bool IsValidCoordinates(double lat, double lng) =>
        double.IsFinite(lat) && double.IsFinite(lng) &&
        lat is >= -90.0 and <= 90.0 &&
        lng is >= -180.0 and <= 180.0;

    /// <summary>
    /// Great-circle distance in kilometres between two points. Returns
    /// <see cref="double.MaxValue"/> when the second point is missing so callers
    /// can treat unknown locations as "infinitely far".
    /// </summary>
    public static double HaversineDistance(double lat1, double lon1, double? lat2, double? lon2)
    {
        if (lat2 is null || lon2 is null)
            return double.MaxValue;

        var dLat = (lat2.Value - lat1) * Math.PI / 180;
        var dLon = (lon2.Value - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2.Value * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusKm * c;
    }
}
