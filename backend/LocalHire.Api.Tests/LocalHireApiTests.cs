using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using LocalHire.Api.Validators;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Swashbuckle.AspNetCore.Swagger;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class LocalHireApiTests
{
    private const string Password = "Password1!";

    private static readonly string[] ExpectedRoundTripSkills = { "Billing", "Customer service" };
    private static readonly string[] ExpectedRoundTripLanguages = { "Kannada", "Hindi" };
    private static readonly string[] ExpectedRoundTripBenefits = { "Provident Fund", "Meals" };
    private static readonly string[] ExpectedUpdatedSkills = { "Billing" };

    [Fact]
    public void Swagger_document_includes_resume_upload()
    {
        using var factory = new ApiFactory();
        var swagger = factory.Services.GetRequiredService<ISwaggerProvider>().GetSwagger("v1");

        Assert.Contains("/api/me/resume", swagger.Paths.Keys);
    }

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
        Assert.Equal(ExpectedRoundTripSkills, created.RequiredSkills);
        Assert.Equal(ExpectedRoundTripLanguages, created.Languages);
        Assert.Equal(ExpectedRoundTripBenefits, created.Benefits);

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

    [Fact]
    public async Task Job_can_be_fetched_by_id_and_updated()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await Register(client, "Hiring");
        var token = await Login(client, "Hiring");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var create = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", "Maharashtra", "400050", 0, 0,
                EmploymentType: "FullTime", SalaryMin: 15000, SalaryMax: 25000, SalaryPeriod: "Monthly"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<JobPostResponse>();

        // GET by id returns the job.
        var fetched = await client.GetFromJsonAsync<JobPostResponse>($"/api/hiring/jobs/{created!.Id}");
        Assert.Equal("Cashier", fetched!.Title);
        Assert.Equal("FullTime", fetched.EmploymentType);

        // Unknown id -> 404.
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/hiring/jobs/{Guid.NewGuid()}")).StatusCode);

        // PUT updates the job and returns the new values.
        var update = await client.PutAsJsonAsync($"/api/hiring/jobs/{created.Id}",
            new CreateJobPostRequest("Senior Cashier", "Lead the till", "Corner Shop", "Bandra", "Maharashtra", "400050", 0, 0,
                EmploymentType: "PartTime", SalaryMin: 20000, SalaryMax: 30000, SalaryPeriod: "Monthly",
                RequiredSkills: new List<string> { "Billing" }));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = await update.Content.ReadFromJsonAsync<JobPostResponse>();
        Assert.Equal("Senior Cashier", updated!.Title);
        Assert.Equal("PartTime", updated.EmploymentType);
        Assert.Equal(30000, updated.SalaryMax);
        Assert.Equal(ExpectedUpdatedSkills, updated.RequiredSkills);

        // The change is persisted.
        var refetched = await client.GetFromJsonAsync<JobPostResponse>($"/api/hiring/jobs/{created.Id}");
        Assert.Equal("Senior Cashier", refetched!.Title);

        // Invalid update is rejected.
        var bad = await client.PutAsJsonAsync($"/api/hiring/jobs/{created.Id}",
            new CreateJobPostRequest("", "x", "y", "z"));
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);

        // Updating an unknown job -> 404.
        var missing = await client.PutAsJsonAsync($"/api/hiring/jobs/{Guid.NewGuid()}",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", "Maharashtra", "400050", 0, 0));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        // A worker account cannot read or update hiring jobs.
        await Register(client, "LookingForWork");
        var workerToken = await Login(client, "LookingForWork");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/hiring/jobs/{created.Id}")).StatusCode);
        var workerUpdate = await client.PutAsJsonAsync($"/api/hiring/jobs/{created.Id}",
            new CreateJobPostRequest("Hacked", "x", "y", "z", "Maharashtra", "400050", 0, 0));
        Assert.Equal(HttpStatusCode.Forbidden, workerUpdate.StatusCode);
    }

    [Fact]
    public async Task Applications_listing_and_unfiltered_nearby_work()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await Register(client, "Hiring");
        await Register(client, "LookingForWork");
        var hiringToken = await Login(client, "Hiring");
        var workerToken = await Login(client, "LookingForWork");

        // Hiring creates a job.
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hiringToken);
        var createJob = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", "Maharashtra", "400050", 0, 0));
        var job = await createJob.Content.ReadFromJsonAsync<JobPostResponse>();

        // Applications for an unknown job -> 404; for a real job with none -> empty.
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hiring/jobs/{Guid.NewGuid()}/applications")).StatusCode);
        var noApplicants = await client.GetFromJsonAsync<List<ApplicantResponse>>($"/api/hiring/jobs/{job!.Id}/applications");
        Assert.Empty(noApplicants!);

        // Worker applies, lists their applications, and browses all active jobs (no coordinates).
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsync($"/api/work/jobs/{job.Id}/apply", null)).StatusCode);

        var myApplications = await client.GetFromJsonAsync<List<JobApplicationResponse>>("/api/work/applications");
        Assert.Single(myApplications!);
        Assert.Equal(job.Id, myApplications![0].JobPostId);
        Assert.Equal("Cashier", myApplications[0].JobTitle);

        var allActive = await client.GetFromJsonAsync<List<JobPostResponse>>("/api/work/jobs/nearby");
        Assert.Contains(allActive!, j => j.Id == job.Id);

        // Hiring now sees the applicant.
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hiringToken);
        var applicants = await client.GetFromJsonAsync<List<ApplicantResponse>>($"/api/hiring/jobs/{job.Id}/applications");
        Assert.Single(applicants!);
        Assert.Equal("Applied", applicants![0].Status);
        Assert.Equal("Person", applicants[0].WorkerName);

        var candidate = await client.GetFromJsonAsync<CandidateDetailResponse>(
            $"/api/hiring/candidates/{applicants[0].WorkerId}");
        Assert.Equal("person@example.com", candidate!.Email);
        Assert.Equal(applicants[0].WorkerId, candidate.Id);

        var shortlist = await client.PostAsync(
            $"/api/hiring/jobs/{job.Id}/applications/{applicants[0].Id}/shortlist", null);
        Assert.Equal(HttpStatusCode.OK, shortlist.StatusCode);
        Assert.Equal("Shortlisted", (await shortlist.Content.ReadFromJsonAsync<ApplicantResponse>())!.Status);

        var refreshedApplicants = await client.GetFromJsonAsync<List<ApplicantResponse>>(
            $"/api/hiring/jobs/{job.Id}/applications");
        Assert.Equal("Shortlisted", Assert.Single(refreshedApplicants!).Status);
        Assert.Equal(1, Assert.Single(await client.GetFromJsonAsync<List<JobPostResponse>>(
            "/api/hiring/jobs") ?? []).ShortlistedCount);

        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hiring/candidates/{Guid.NewGuid()}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.PostAsync($"/api/hiring/jobs/{job.Id}/applications/{Guid.NewGuid()}/shortlist", null)).StatusCode);
    }

    [Fact]
    public async Task Nearby_matches_jobs_across_the_antimeridian()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await Register(client, "Hiring");
        await Register(client, "LookingForWork");
        var hiringToken = await Login(client, "Hiring");
        var workerToken = await Login(client, "LookingForWork");

        // Job sits just west of the +180° meridian.
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hiringToken);
        var create = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Dock hand", "Port work", "Harbour", "Taveuni", "Fiji", "111111", 0, 179.95));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var job = await create.Content.ReadFromJsonAsync<JobPostResponse>();

        // Worker sits just east of it: the bounding box must wrap around -180°.
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);
        var nearby = await client.GetFromJsonAsync<List<JobPostResponse>>("/api/work/jobs/nearby?lat=0&lng=-179.95");
        Assert.Contains(nearby!, j => j.Id == job!.Id);
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
