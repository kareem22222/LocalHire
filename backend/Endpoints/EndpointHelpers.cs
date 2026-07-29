using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using Amazon.S3;
using Amazon.S3.Model;
using FluentValidation.Results;
using LocalHire.Api.DTOs;
using LocalHire.Api.Services;
using LocalHire.Api.Utilities;

namespace LocalHire.Api.Endpoints;

internal static class EndpointHelpers
{
    private const string CoordinatesErrorKey = "coordinates";

    private const string CoordinatesRequiredTogether =
        "Latitude and longitude are required together.";

    private const string CoordinatesOutOfRange =
        "Latitude must be between -90 and 90, and longitude must be between -180 and 180.";

    public static Dictionary<string, string[]> ToValidationErrors(this ValidationResult validation) =>
        validation.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

    public static bool TryGetUserId(this ClaimsPrincipal user, out Guid userId)
    {
        var claim = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out userId);
    }

    public static string ResumeContentType(string fileName) =>
        Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _ => "application/octet-stream",
        };

    public static async Task<ResumeDownloadResponse> CreateResumeDownloadAsync(
        IAmazonS3 s3, string bucket, ResumeFileReference resume)
    {
        var disposition = new ContentDispositionHeaderValue("attachment")
        {
            FileName = resume.FileName,
            FileNameStar = resume.FileName,
        };
        var url = await s3.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        {
            BucketName = bucket,
            Key = resume.Key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(5),
            ResponseHeaderOverrides = new ResponseHeaderOverrides
            {
                ContentType = ResumeContentType(resume.FileName),
                ContentDisposition = disposition.ToString(),
            },
        });
        return new ResumeDownloadResponse(url, resume.FileName);
    }

    /// <summary>
    /// Validates an optional latitude/longitude pair from the query string.
    /// Returns a ready-to-send <see cref="IResult"/> validation problem when the
    /// pair is incomplete or out of range, or <c>null</c> when the input is valid
    /// (including the "no coordinates supplied" case).
    /// </summary>
    public static IResult? ValidateCoordinatePair(double? lat, double? lng)
    {
        if (lat.HasValue != lng.HasValue)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [CoordinatesErrorKey] = [CoordinatesRequiredTogether]
            });
        }

        // lat/lng are supplied together (checked above), so testing lat is enough.
        if (lat is not null && !GeoCalculator.IsValidCoordinates(lat.Value, lng!.Value))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                [CoordinatesErrorKey] = [CoordinatesOutOfRange]
            });
        }

        return null;
    }
}
