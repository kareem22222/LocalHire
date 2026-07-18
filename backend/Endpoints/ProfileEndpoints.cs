using System.Security.Claims;
using Amazon.S3;
using Amazon.S3.Model;
using FluentValidation;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace LocalHire.Api.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/me")
            .WithTags("Profile")
            .RequireAuthorization();

        group.MapPut("/profile", async (
            UpdateProfileRequest request,
            IValidator<UpdateProfileRequest> validator,
            ClaimsPrincipal user,
            IProfileService profileService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToValidationErrors());
            }

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var profile = await profileService.UpdateProfileAsync(userId, request, ct);
            return Results.Ok(profile);
        })
        .WithName("UpdateProfile")
        .Produces<UserProfile>()
        .ProducesValidationProblem()
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPut("/location", async (
            UpdateLocationRequest request,
            IValidator<UpdateLocationRequest> validator,
            ClaimsPrincipal user,
            IProfileService profileService,
            CancellationToken ct) =>
        {
            var validation = await validator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return Results.ValidationProblem(validation.ToValidationErrors());
            }

            if (!user.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var profile = await profileService.UpdateLocationAsync(userId, request, ct);
            return Results.Ok(profile);
        })
        .WithName("UpdateLocation");

        group.MapPut("/resume", async (
            [FromForm] IFormFile resume,
            ClaimsPrincipal principal,
            LocalHireDbContext db,
            IAmazonS3 s3,
            IConfiguration configuration,
            IMemoryCache cache,
            IProfileService profileService,
            CancellationToken ct) =>
        {
            if (!principal.TryGetUserId(out var userId))
                return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
            if (user is null || user.Role != UserRole.LookingForWork)
                return Results.Forbid();

            const long maxBytes = 5 * 1024 * 1024;
            var extension = Path.GetExtension(resume.FileName).ToLowerInvariant();
            var fileName = Path.GetFileName(resume.FileName);
            if (resume.Length is 0 or > maxBytes || fileName.Length > 255 || extension is not (".pdf" or ".doc" or ".docx"))
                return Results.BadRequest(new { message = "Resume must be a PDF, DOC, or DOCX file no larger than 5 MB." });

            await using (var checkStream = resume.OpenReadStream())
            {
                var header = new byte[8];
                var bytesRead = await checkStream.ReadAsync(header, ct);
                if (!HasExpectedSignature(extension, header.AsSpan(0, bytesRead)))
                    return Results.BadRequest(new { message = "The resume contents do not match its file extension." });
            }

            var bucket = configuration["AWS:S3Bucket"];
            if (string.IsNullOrWhiteSpace(bucket))
                return Results.Problem("AWS:S3Bucket is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable);

            var key = $"resumes/{userId}/current";
            await using var stream = resume.OpenReadStream();
            await s3.PutObjectAsync(new PutObjectRequest
            {
                BucketName = bucket,
                Key = key,
                InputStream = stream,
                ContentType = extension switch
                {
                    ".pdf" => "application/pdf",
                    ".doc" => "application/msword",
                    _ => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                },
                AutoCloseStream = false,
            }, ct);

            user.ResumeKey = key;
            user.ResumeFileName = fileName;
            await db.SaveChangesAsync(ct);
            cache.Remove($"user_profile_{userId}");

            return Results.Ok(await profileService.GetProfileAsync(userId, ct));
        })
        .WithName("UploadResume")
        .DisableAntiforgery()
        .Accepts<IFormFile>("multipart/form-data")
        .Produces<UserProfile>()
        .ProducesProblem(StatusCodes.Status503ServiceUnavailable)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status403Forbidden);
    }

    private static bool HasExpectedSignature(string extension, ReadOnlySpan<byte> header) => extension switch
    {
        ".pdf" => header.StartsWith("%PDF"u8),
        ".doc" => header.StartsWith(new byte[] { 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1 }),
        ".docx" => header.StartsWith(new byte[] { 0x50, 0x4B, 0x03, 0x04 }),
        _ => false,
    };
}
