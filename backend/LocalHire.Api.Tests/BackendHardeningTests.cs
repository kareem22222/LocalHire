using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class BackendHardeningTests
{
    private const string Password = "Password1!";

    [Fact]
    public async Task Worker_job_title_is_searchable_without_exposing_private_profile_fields()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var workerToken = await Register(client, "worker-profile@example.com", "LookingForWork");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);
        var update = await client.PutAsJsonAsync("/api/me/profile", new UpdateProfileRequest(
            "Asha Rao", "+91 98765 43210", new DateOnly(1995, 5, 20), "Female",
            "12 Market Road", "Indiranagar", "Karnataka", "560038", "Driver"));
        update.EnsureSuccessStatusCode();
        var worker = await update.Content.ReadFromJsonAsync<UserProfile>();
        Assert.Equal("Driver", worker!.JobTitle);
        (await client.PutAsJsonAsync("/api/me/location", new UpdateLocationRequest(12.971, 77.641)))
            .EnsureSuccessStatusCode();

        var employerToken = await Register(client, "employer-search@example.com", "Hiring");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", employerToken);

        var matches = await client.GetFromJsonAsync<List<CandidateResponse>>(
            "/api/hiring/candidates/nearby?role=driver");
        Assert.Contains(matches!, candidate => candidate.Id == worker.Id && candidate.Role == "Driver");

        var detail = await client.GetAsync($"/api/hiring/candidates/{worker.Id}");
        detail.EnsureSuccessStatusCode();
        var json = await detail.Content.ReadAsStringAsync();
        Assert.Contains("worker-profile@example.com", json);
        Assert.DoesNotContain("dateOfBirth", json);
        Assert.DoesNotContain("gender", json);
        Assert.DoesNotContain("addressLine", json);
        Assert.DoesNotContain("latitude", json);
        Assert.DoesNotContain("longitude", json);
    }

    [Fact]
    public async Task Employer_cannot_access_another_employers_job()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var ownerToken = await Register(client, "owner@example.com", "Hiring");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var create = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra"));
        create.EnsureSuccessStatusCode();
        var job = await create.Content.ReadFromJsonAsync<JobPostResponse>();

        var otherToken = await Register(client, "other-employer@example.com", "Hiring");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherToken);

        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hiring/jobs/{job!.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hiring/jobs/{job.Id}/applications")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.PutAsJsonAsync($"/api/hiring/jobs/{job.Id}",
                new CreateJobPostRequest("Changed", "No", "No", "No"))).StatusCode);
    }

    [Fact]
    public async Task Job_browse_returns_only_the_100_most_recent_active_jobs()
    {
        using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
        var employer = new User
        {
            Id = Guid.NewGuid(),
            Name = "Employer",
            Email = "browse-employer@example.com",
            PasswordHash = "hash",
            Role = UserRole.Hiring,
            CreatedAt = DateTimeOffset.UtcNow
        };
        var start = DateTimeOffset.UtcNow.AddDays(-1);
        db.Users.Add(employer);
        db.JobPosts.AddRange(Enumerable.Range(0, 105).Select(index => new JobPost
        {
            Id = Guid.NewGuid(),
            EmployerId = employer.Id,
            Title = $"Job {index}",
            Description = "Description",
            WorkplaceName = "Workplace",
            CityArea = "Area",
            IsActive = true,
            CreatedAt = start.AddMinutes(index)
        }));
        await db.SaveChangesAsync();

        var jobs = await new JobService(db).GetNearbyJobsAsync(null, null, CancellationToken.None);

        Assert.Equal(100, jobs.Count);
        Assert.Equal("Job 104", jobs[0].Title);
        Assert.DoesNotContain(jobs, job => job.Title == "Job 0");
    }

    private static async Task<string> Register(HttpClient client, string email, string role)
    {
        client.DefaultRequestHeaders.Authorization = null;
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Person", email, Password, role));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }
}
