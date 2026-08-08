using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class OwnedPaginationTests
{
    private const string Password = "Password1!";

    [Fact]
    public async Task Owned_lists_page_without_leaking_other_users_or_saved_items()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "Employer One", "employer1@example.com", "Hiring");
        await Register(client, "Employer Two", "employer2@example.com", "Hiring");
        await Register(client, "Worker", "worker@example.com", "LookingForWork");

        var ids = SeedOwnedLists(factory);
        var employerToken = await Login(client, "employer1@example.com", "Hiring");
        var otherEmployerToken = await Login(client, "employer2@example.com", "Hiring");
        var workerToken = await Login(client, "worker@example.com", "LookingForWork");

        Authenticate(client, employerToken);
        var jobs = (await client.GetFromJsonAsync<PagedResponse<JobPostResponse>>(
            "/api/hiring/jobs/paged?page=1&pageSize=1&status=all"))!;
        var openJobs = (await client.GetFromJsonAsync<PagedResponse<JobPostResponse>>(
            "/api/hiring/jobs/paged?status=open"))!;
        var applicants = (await client.GetFromJsonAsync<PagedResponse<ApplicantResponse>>(
            $"/api/hiring/jobs/{ids.OpenJob}/applications/paged?status=Applied"))!;
        var savedCandidates = (await client.GetFromJsonAsync<PagedResponse<CandidateResponse>>(
            "/api/hiring/saved-candidates/paged"))!;

        Assert.Equal(2, jobs.TotalCount);
        Assert.Equal(2, jobs.TotalPages);
        Assert.Equal(ids.OpenJob, openJobs.Items.Single().Id);
        Assert.Single(applicants.Items);
        Assert.Equal(ids.Worker, savedCandidates.Items.Single().Id);

        Authenticate(client, otherEmployerToken);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync(
                $"/api/hiring/jobs/{ids.OpenJob}/applications/paged")).StatusCode);

        Authenticate(client, workerToken);
        var applications = (await client.GetFromJsonAsync<ApplicationPagedResponse>(
            "/api/work/applications/paged?pageSize=1"))!;
        var savedJobs = (await client.GetFromJsonAsync<PagedResponse<JobPostResponse>>(
            "/api/work/saved-jobs/paged"))!;
        var notifications = (await client.GetFromJsonAsync<NotificationPagedResponse>(
            "/api/notifications/paged?status=unread"))!;

        Assert.Equal(2, applications.TotalCount);
        Assert.Equal(2, applications.TotalPages);
        Assert.Equal(1, applications.ShortlistedCount);
        Assert.Equal(ids.ClosedJob, savedJobs.Items.Single().Id);
        Assert.Single(notifications.Items);
        Assert.Equal(1, notifications.UnreadCount);
        Assert.Equal(1, notifications.ReadCount);
    }

    [Fact]
    public async Task Paged_filters_reject_unknown_values()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "Employer", "employer@example.com", "Hiring");
        Authenticate(client, await Login(client, "employer@example.com", "Hiring"));

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.GetAsync("/api/hiring/jobs/paged?status=unknown")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.GetAsync(
                $"/api/hiring/jobs/{Guid.NewGuid()}/applications/paged?status=unknown")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.GetAsync("/api/notifications/paged?status=unknown")).StatusCode);
    }

    private static (Guid Worker, Guid OpenJob, Guid ClosedJob) SeedOwnedLists(ApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
        var employer = db.Users.Single(user => user.Email == "employer1@example.com");
        var otherEmployer = db.Users.Single(user => user.Email == "employer2@example.com");
        var worker = db.Users.Single(user => user.Email == "worker@example.com");
        var now = DateTimeOffset.UtcNow;
        var openJob = Job(employer.Id, "Open role", true, now);
        var closedJob = Job(employer.Id, "Saved closed role", false, now.AddMinutes(-1));
        var otherJob = Job(otherEmployer.Id, "Other employer role", true, now);
        var applied = Application(openJob.Id, worker.Id, ApplicationStatus.Applied, now);
        var shortlisted = Application(closedJob.Id, worker.Id, ApplicationStatus.Shortlisted, now.AddMinutes(-1));

        db.JobPosts.AddRange(openJob, closedJob, otherJob);
        db.JobApplications.AddRange(applied, shortlisted);
        db.SavedJobs.Add(new SavedJob
        {
            Id = Guid.NewGuid(), WorkerId = worker.Id, JobPostId = closedJob.Id, CreatedAt = now
        });
        db.SavedCandidates.Add(new SavedCandidate
        {
            Id = Guid.NewGuid(), EmployerId = employer.Id, WorkerId = worker.Id, CreatedAt = now
        });
        db.Notifications.AddRange(
            Notification(worker.Id, false, now),
            Notification(worker.Id, true, now.AddMinutes(-1)),
            Notification(employer.Id, false, now));
        db.SaveChanges();
        return (worker.Id, openJob.Id, closedJob.Id);
    }

    private static JobPost Job(Guid employerId, string title, bool active, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(), EmployerId = employerId, Title = title, Description = title,
        WorkplaceName = "Local business", CityArea = "Bengaluru", State = "Karnataka",
        IsActive = active, CreatedAt = createdAt
    };

    private static JobApplication Application(
        Guid jobId, Guid workerId, ApplicationStatus status, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(), JobPostId = jobId, WorkerId = workerId,
        Status = status, CreatedAt = createdAt, StatusUpdatedAt = createdAt
    };

    private static Notification Notification(Guid userId, bool read, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(), UserId = userId, Type = "Test", Title = "Update",
        Message = "Test notification", IsRead = read, CreatedAt = createdAt,
        ReadAt = read ? createdAt : null
    };

    private static async Task Register(HttpClient client, string name, string email, string role) =>
        Assert.Equal(HttpStatusCode.Created,
            (await client.PostAsJsonAsync("/api/auth/register",
                new RegisterRequest(name, email, Password, role))).StatusCode);

    private static async Task<string> Login(HttpClient client, string email, string role)
    {
        var response = await client.PostAsJsonAsync(
            "/api/auth/login", new LoginRequest(email, Password, role));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    private static void Authenticate(HttpClient client, string token) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
}
