namespace LocalHire.Api.Utilities;

/// <summary>
/// Pure geospatial helpers. Kept free of EF/HTTP concerns so they can be unit
/// tested in isolation and reused wherever coordinate math is needed.
/// </summary>
public static class GeoCalculator
{
    private const double EarthRadiusKm = 6371;

    // Length of one degree of latitude (and of longitude at the equator),
    // derived from the Earth radius so the bounding box and the Haversine
    // distance share the same sphere model.
    private const double KmPerLatitudeDegree = EarthRadiusKm * Math.PI / 180.0;

    // Extra outward padding applied to the flat bounding box so it always fully
    // encloses the requested-radius circle despite the spherical approximation.
    // 1% comfortably absorbs the error for the radii this app uses.
    private const double BoundingBoxSafetyMargin = 1.01;

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
    /// Computes a bounding box that is guaranteed to contain every point within
    /// <paramref name="radiusKm"/> of the given coordinate. Latitude bounds are
    /// clamped to [-90, 90] and both spans include a small outward margin so the
    /// box never clips the circle. When the circle reaches a pole (or the
    /// longitude span is otherwise undefined) the box covers all longitudes.
    /// This is only a coarse pre-filter; <see cref="HaversineDistance"/> remains
    /// the exact final distance check. Pure math with no EF/HTTP dependencies.
    /// </summary>
    public static BoundingBox GetBoundingBox(double lat, double lng, double radiusKm)
    {
        var latDelta = radiusKm / KmPerLatitudeDegree * BoundingBoxSafetyMargin;

        var minLat = Math.Max(-90.0, lat - latDelta);
        var maxLat = Math.Min(90.0, lat + latDelta);

        // Longitude lines converge toward the poles, so a fixed east/west
        // distance covers more degrees the closer we are to a pole. Size the
        // longitude window using the box edge nearest a pole (largest |lat|) so
        // the box conservatively contains the whole circle.
        var polewardLat = Math.Max(Math.Abs(minLat), Math.Abs(maxLat));
        var cosLat = Math.Cos(polewardLat * Math.PI / 180.0);

        double lngDelta;
        if (maxLat >= 90.0 || minLat <= -90.0 || cosLat <= 1e-9)
        {
            // The circle reaches a pole or the longitude span is undefined:
            // no finite east/west bound applies, so cover every longitude.
            lngDelta = 180.0;
        }
        else
        {
            lngDelta = Math.Min(180.0, radiusKm / (KmPerLatitudeDegree * cosLat) * BoundingBoxSafetyMargin);
        }

        return new BoundingBox(minLat, maxLat, lng - lngDelta, lng + lngDelta, lngDelta);
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
