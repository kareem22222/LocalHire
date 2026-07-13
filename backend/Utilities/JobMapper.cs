using System.Globalization;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;

namespace LocalHire.Api.Utilities;

/// <summary>
/// Translates between <see cref="JobPost"/> entities and their request/response
/// DTOs. Centralizing this here keeps the endpoints focused on HTTP concerns and
/// removes the duplicated field mapping that create and update would otherwise
/// each carry.
/// </summary>
public static class JobMapper
{
    /// <summary>
    /// Creates a new <see cref="JobPost"/> owned by <paramref name="employerId"/>
    /// from a create request. The required members are set on the initializer to
    /// satisfy the compiler; <see cref="ApplyRequest"/> remains the single source
    /// of truth for the full field mapping.
    /// </summary>
    public static JobPost CreateFrom(CreateJobPostRequest request, Guid employerId)
    {
        var job = new JobPost
        {
            Id = Guid.NewGuid(),
            EmployerId = employerId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            WorkplaceName = request.WorkplaceName.Trim(),
            CityArea = request.CityArea.Trim(),
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        ApplyRequest(job, request);
        return job;
    }

    /// <summary>
    /// Copies the editable fields from a create/update request onto a job entity.
    /// Shared by both the create and update endpoints so their mapping never drifts.
    /// </summary>
    public static void ApplyRequest(JobPost job, CreateJobPostRequest request)
    {
        job.Title = request.Title.Trim();
        job.Description = request.Description.Trim();
        job.WorkplaceName = request.WorkplaceName.Trim();
        job.CityArea = request.CityArea.Trim();
        job.State = NormalizeText(request.State);
        job.Pincode = NormalizeText(request.Pincode);
        job.Latitude = request.Latitude is not null ? Math.Round(request.Latitude.Value, 3) : null;
        job.Longitude = request.Longitude is not null ? Math.Round(request.Longitude.Value, 3) : null;
        job.EmploymentType = ParseEnum<EmploymentType>(request.EmploymentType);
        job.SalaryMin = request.SalaryMin;
        job.SalaryMax = request.SalaryMax;
        job.SalaryPeriod = ParseEnum<SalaryPeriod>(request.SalaryPeriod);
        job.MinEducation = NormalizeText(request.MinEducation);
        job.ExperienceMinYears = request.ExperienceMinYears;
        job.ExperienceMaxYears = request.ExperienceMaxYears;
        job.WorkingDays = NormalizeText(request.WorkingDays);
        job.ShiftStartTime = ParseTime(request.ShiftStartTime);
        job.ShiftEndTime = ParseTime(request.ShiftEndTime);
        job.Openings = request.Openings;
        job.RequiredSkills = NormalizeList(request.RequiredSkills);
        job.Languages = NormalizeList(request.Languages);
        job.Benefits = NormalizeList(request.Benefits);
    }

    public static JobPostResponse ToResponse(JobPost j, int applicationCount) =>
        new(j.Id, j.Title, j.Description, j.WorkplaceName,
            j.CityArea, j.State, j.Pincode, j.Latitude, j.Longitude,
            j.EmploymentType?.ToString(), j.SalaryMin, j.SalaryMax, j.SalaryPeriod?.ToString(),
            j.MinEducation, j.ExperienceMinYears, j.ExperienceMaxYears,
            j.WorkingDays,
            j.ShiftStartTime?.ToString("HH\\:mm", CultureInfo.InvariantCulture),
            j.ShiftEndTime?.ToString("HH\\:mm", CultureInfo.InvariantCulture),
            j.Openings, j.RequiredSkills, j.Languages, j.Benefits,
            j.IsActive, j.CreatedAt, applicationCount);

    public static string? NormalizeText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static TEnum? ParseEnum<TEnum>(string? value) where TEnum : struct, Enum =>
        Enum.TryParse<TEnum>(value, out var parsed) ? parsed : null;

    public static TimeOnly? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var hm))
            return hm;
        if (TimeOnly.TryParseExact(value, "HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var hms))
            return hms;
        return null;
    }

    public static List<string> NormalizeList(List<string>? values) =>
        values is null
            ? new List<string>()
            : values
                .Select(v => v?.Trim())
                .Where(v => !string.IsNullOrEmpty(v))
                .Select(v => v!)
                .Distinct()
                .ToList();
}
