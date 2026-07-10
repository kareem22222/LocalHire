using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using LocalHire.Api.Validators;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class LocalHireApiTests
{
    private const string Password = "Password1!";

    [Fact]
    public void Validators_reject_bad_roles_passwords_and_coordinates()
    {
        Assert.False(new RegisterRequestValidator()
            .Validate(new RegisterRequest("A", "a@example.com", "weak", "Boss"))
            .IsValid);

        Assert.False(new LoginRequestValidator()
            .Validate(new LoginRequest("a@example.com", Password, "Boss"))
            .IsValid);

        Assert.False(new CreateJobPostRequestValidator()
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", null, null, 91, 0))
            .IsValid);

        Assert.False(new CreateJobPostRequestValidator()
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", "Maharashtra", "12", 0, 0))
            .IsValid);

        Assert.True(new CreateJobPostRequestValidator()
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", "Maharashtra", "400050", 0, 0))
            .IsValid);

        // Rich role details
        Assert.False(new CreateJobPostRequestValidator()
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", EmploymentType: "Banana"))
            .IsValid);

        Assert.False(new CreateJobPostRequestValidator()
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", SalaryMin: 15000))
            .IsValid);

        Assert.False(new CreateJobPostRequestValidator()
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", SalaryMin: 20000, SalaryMax: 10000, SalaryPeriod: "Monthly"))
            .IsValid);

        Assert.False(new CreateJobPostRequestValidator()
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", ShiftStartTime: "9am"))
            .IsValid);

        Assert.True(new CreateJobPostRequestValidator()
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra",
                EmploymentType: "FullTime", SalaryMin: 15000, SalaryMax: 25000, SalaryPeriod: "Monthly",
                MinEducation: "10th pass", ExperienceMinYears: 1, ExperienceMaxYears: 3,
                WorkingDays: "Mon-Sat", ShiftStartTime: "09:00", ShiftEndTime: "18:00", Openings: 2,
                RequiredSkills: new List<string> { "Billing" }, Languages: new List<string> { "Hindi" }, Benefits: new List<string> { "PF" }))
            .IsValid);

        Assert.False(new UpdateProfileRequestValidator()
            .Validate(new UpdateProfileRequest("", null, null, null, null, null, null, null))
            .IsValid);

        Assert.False(new UpdateProfileRequestValidator()
            .Validate(new UpdateProfileRequest("Asha", null, null, null, null, null, null, "12"))
            .IsValid);

        Assert.True(new UpdateProfileRequestValidator()
            .Validate(new UpdateProfileRequest("Asha", "+91 98765 43210", new DateOnly(1995, 5, 20), "Female", "12 MG Road", "Indiranagar", "Karnataka", "560038"))
            .IsValid);

        Assert.False(new UpdateLocationRequestValidator()
            .Validate(new UpdateLocationRequest(91, 181))
            .IsValid);

        Assert.False(new UpdateLocationRequestValidator()
            .Validate(new UpdateLocationRequest(null, 0))
            .IsValid);
    }

    [Fact]
    public async Task Auth_is_role_separated()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Created, (await Register(client, "Hiring")).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Register(client, "LookingForWork")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Register(client, "Hiring")).StatusCode);

        var hiringToken = await Login(client, "Hiring");
        var workerLogin = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("person@example.com", Password, "LookingForWork"));

        Assert.Equal(HttpStatusCode.OK, workerLogin.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hiringToken);
        var me = await client.GetFromJsonAsync<UserProfile>("/api/auth/me");

        Assert.Equal("Hiring", me!.Role.ToString());
        Assert.Contains("\"role\":\"Hiring\"", await client.GetStringAsync("/api/auth/me"));

        var wrongPassword = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("person@example.com", Password + "x", "Hiring"));
        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
    }

    [Fact]
    public async Task Profile_update_persists_new_fields()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Created, (await Register(client, "Hiring")).StatusCode);
        var token = await Login(client, "Hiring");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var update = new UpdateProfileRequest(
            "Asha Rao", "+91 98765 43210", new DateOnly(1995, 5, 20), "Female",
            "12 MG Road", "Indiranagar", "Karnataka", "560038");

        var response = await client.PutAsJsonAsync("/api/me/profile", update);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<UserProfile>();
        Assert.Equal("Asha Rao", updated!.Name);
        Assert.Equal("Karnataka", updated.State);
        Assert.Equal("560038", updated.Pincode);
        Assert.Equal(new DateOnly(1995, 5, 20), updated.DateOfBirth);

        // Persisted and returned by /auth/me
        var me = await client.GetFromJsonAsync<UserProfile>("/api/auth/me");
        Assert.Equal("Indiranagar", me!.CityArea);
        Assert.Equal("+91 98765 43210", me.Phone);

        // Invalid pincode rejected
        var bad = await client.PutAsJsonAsync("/api/me/profile",
            new UpdateProfileRequest("Asha Rao", null, null, null, null, null, null, "12"));
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task Job_details_round_trip_over_http()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await Register(client, "Hiring");
        var token = await Login(client, "Hiring");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateJobPostRequest(
            "Store Associate", "Handle billing and stock", "FreshMart", "Indiranagar",
            State: "Karnataka", Pincode: "560038", Latitude: 12.971, Longitude: 77.641,
            EmploymentType: "FullTime", SalaryMin: 18000, SalaryMax: 26000, SalaryPeriod: "Monthly",
            MinEducation: "12th pass", ExperienceMinYears: 1, ExperienceMaxYears: 4,
            WorkingDays: "Mon-Sat", ShiftStartTime: "09:30", ShiftEndTime: "18:30", Openings: 3,
            RequiredSkills: new List<string> { "Billing", "Customer service" },
            Languages: new List<string> { "Kannada", "Hindi" },
            Benefits: new List<string> { "Provident Fund", "Meals" });

        var create = await client.PostAsJsonAsync("/api/hiring/jobs", request);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var created = await create.Content.ReadFromJsonAsync<JobPostResponse>();
        Assert.Equal("FullTime", created!.EmploymentType);
        Assert.Equal("Monthly", created.SalaryPeriod);
        Assert.Equal(18000, created.SalaryMin);
        Assert.Equal(26000, created.SalaryMax);
        Assert.Equal("09:30", created.ShiftStartTime);
        Assert.Equal("18:30", created.ShiftEndTime);
        Assert.Equal(3, created.Openings);
        Assert.Equal(new[] { "Billing", "Customer service" }, created.RequiredSkills);
        Assert.Equal(new[] { "Kannada", "Hindi" }, created.Languages);
        Assert.Equal(new[] { "Provident Fund", "Meals" }, created.Benefits);

        // Persisted: re-read through the list endpoint
        var jobs = await client.GetFromJsonAsync<List<JobPostResponse>>("/api/hiring/jobs");
        var fetched = Assert.Single(jobs!);
        Assert.Equal("12th pass", fetched.MinEducation);
        Assert.Equal("Mon-Sat", fetched.WorkingDays);
        Assert.Equal(1, fetched.ExperienceMinYears);
        Assert.Equal(4, fetched.ExperienceMaxYears);
        Assert.Equal(2, fetched.Languages.Count);
        Assert.Contains("Meals", fetched.Benefits);

        // Invalid employment type rejected
        var bad = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Bad", "x", "y", "z", EmploymentType: "NotAType"));
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public void Job_string_list_comparer_hashes_null_lists_and_items()
    {
        using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
        var comparer = db.Model
            .FindEntityType(typeof(JobPost))!
            .FindProperty(nameof(JobPost.RequiredSkills))!
            .GetValueComparer()!;

        Assert.Equal(0, comparer.GetHashCode(null));
        Assert.Equal(
            comparer.GetHashCode(new List<string> { "Billing", null!, "Stock" }),
            comparer.GetHashCode(new List<string> { "Billing", null!, "Stock" }));
    }

    [Fact]
    public async Task Role_policies_jobs_and_applications_work()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await Register(client, "Hiring");
        await Register(client, "LookingForWork");

        var hiringToken = await Login(client, "Hiring");
        var workerToken = await Login(client, "LookingForWork");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hiringToken);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/hiring/jobs")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/work/jobs/nearby")).StatusCode);

        var createJob = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", "Maharashtra", "400050", 0, 0));
        Assert.Equal(HttpStatusCode.Created, createJob.StatusCode);
        var job = await createJob.Content.ReadFromJsonAsync<JobPostResponse>();
        Assert.Equal("Maharashtra", job!.State);
        Assert.Equal("400050", job.Pincode);

        var createFarJob = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Remote cashier", "Back office", "Far Shop", "Far Town", "Delhi", "110001", 80, 0));
        Assert.Equal(HttpStatusCode.Created, createFarJob.StatusCode);
        var farJob = await createFarJob.Content.ReadFromJsonAsync<JobPostResponse>();

        var badJob = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", null, null, 91, 0));
        Assert.Equal(HttpStatusCode.BadRequest, badJob.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/hiring/jobs")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/me/location", new UpdateLocationRequest(0, 0))).StatusCode);

        var nearby = await client.GetFromJsonAsync<List<JobPostResponse>>("/api/work/jobs/nearby?lat=0&lng=0");
        Assert.Contains(nearby!, item => item.Id == job!.Id);
        Assert.DoesNotContain(nearby!, item => item.Id == farJob!.Id);

        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/work/jobs/nearby?lat=0")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/work/jobs/nearby?lat=91&lng=0")).StatusCode);

        var badLocation = await client.PutAsJsonAsync("/api/me/location", new UpdateLocationRequest(91, 0));
        Assert.Equal(HttpStatusCode.BadRequest, badLocation.StatusCode);

        var partialLocation = await client.PutAsJsonAsync("/api/me/location", new { latitude = 0 });
        Assert.Equal(HttpStatusCode.BadRequest, partialLocation.StatusCode);

        Assert.Equal(HttpStatusCode.Created, (await client.PostAsync($"/api/work/jobs/{job!.Id}/apply", null)).StatusCode);
        nearby = await client.GetFromJsonAsync<List<JobPostResponse>>("/api/work/jobs/nearby?lat=0&lng=0");
        Assert.Contains(nearby!, item => item.Id == job.Id && item.ApplicationCount == 1);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync($"/api/work/jobs/{job.Id}/apply", null)).StatusCode);
    }

    [Fact]
    public async Task Database_rejects_cross_role_job_links()
    {
        using var factory = new ApiFactory(useMigrations: true);
        using var client = factory.CreateClient();

        await Register(client, "Hiring");
        await Register(client, "LookingForWork");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
        var worker = await db.Users.SingleAsync(u => u.Role == UserRole.LookingForWork);
        var employer = await db.Users.SingleAsync(u => u.Role == UserRole.Hiring);

        db.JobPosts.Add(new JobPost
        {
            Id = Guid.NewGuid(),
            EmployerId = worker.Id,
            Title = "Cashier",
            Description = "Front desk",
            WorkplaceName = "Corner Shop",
            CityArea = "Bandra",
            Latitude = 0,
            Longitude = 0,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());

        db.ChangeTracker.Clear();
        var job = new JobPost
        {
            Id = Guid.NewGuid(),
            EmployerId = employer.Id,
            Title = "Cashier",
            Description = "Front desk",
            WorkplaceName = "Corner Shop",
            CityArea = "Bandra",
            Latitude = 0,
            Longitude = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.JobPosts.Add(job);
        await db.SaveChangesAsync();

        db.JobApplications.Add(new JobApplication
        {
            Id = Guid.NewGuid(),
            JobPostId = job.Id,
            WorkerId = employer.Id,
            Status = ApplicationStatus.Applied,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    private static Task<HttpResponseMessage> Register(HttpClient client, string role) =>
        client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Person", "person@example.com", Password, role));

    private static async Task<string> Login(HttpClient client, string role)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("person@example.com", Password, role));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }
}
