using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class NotificationTests
{
    private const string Password = "Secure123!";
    private const string EmployerEmail = "alerts-employer@example.com";
    private const string WorkerEmail = "alerts-worker@example.com";

    [Fact]
    public async Task Job_events_create_owned_readable_notifications()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await Register(client, "Employer", EmployerEmail, "Hiring");
        await Register(client, "Worker", WorkerEmail, "LookingForWork");
        var employerToken = await Login(client, EmployerEmail, "Hiring");
        var workerToken = await Login(client, WorkerEmail, "LookingForWork");

        client.DefaultRequestHeaders.Authorization = Bearer(employerToken);
        var create = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", "Maharashtra", "400050", 0, 0));
        var job = await create.Content.ReadFromJsonAsync<JobPostResponse>();

        client.DefaultRequestHeaders.Authorization = Bearer(workerToken);
        Assert.Equal(HttpStatusCode.Created,
            (await client.PostAsync($"/api/work/jobs/{job!.Id}/apply", null)).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(employerToken);
        var employerNotifications = await client.GetFromJsonAsync<NotificationListResponse>("/api/notifications");
        var applicationNotification = Assert.Single(employerNotifications!.Items);
        Assert.Equal("NewApplication", applicationNotification.Type);
        Assert.Equal(1, employerNotifications.UnreadCount);
        Assert.Equal("A candidate applied for Cashier.", applicationNotification.Message);
        Assert.DoesNotContain("Worker", applicationNotification.Message);
        Assert.Equal($"/hiring/jobs/{job.Id}/applicants", applicationNotification.Link);

        Assert.Equal(HttpStatusCode.OK,
            (await client.PutAsync($"/api/notifications/{applicationNotification.Id}/read", null)).StatusCode);
        Assert.Equal(0, (await client.GetFromJsonAsync<NotificationListResponse>("/api/notifications"))!.UnreadCount);

        var applicants = await client.GetFromJsonAsync<List<ApplicantResponse>>(
            $"/api/hiring/jobs/{job.Id}/applications");
        Assert.Equal(HttpStatusCode.OK,
            (await client.PostAsync(
                $"/api/hiring/jobs/{job.Id}/applications/{Assert.Single(applicants!).Id}/shortlist", null)).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(workerToken);
        var workerNotifications = await client.GetFromJsonAsync<NotificationListResponse>("/api/notifications");
        Assert.Contains(workerNotifications!.Items, notification => notification.Type == "Shortlisted");

        client.DefaultRequestHeaders.Authorization = Bearer(employerToken);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/hiring/jobs/{job.Id}",
            new CreateJobPostRequest("Cashier", "Updated front desk duties", "Corner Shop", "Bandra", "Maharashtra", "400050", 0, 0))).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(workerToken);
        workerNotifications = await client.GetFromJsonAsync<NotificationListResponse>("/api/notifications");
        Assert.Contains(workerNotifications!.Items, notification => notification.Type == "JobUpdated");
        Assert.Equal(2, workerNotifications.UnreadCount);

        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PutAsync("/api/notifications/read-all", null)).StatusCode);
        Assert.Equal(0, (await client.GetFromJsonAsync<NotificationListResponse>("/api/notifications"))!.UnreadCount);

        client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/notifications")).StatusCode);
    }

    [Fact]
    public async Task Outcomes_create_one_worker_notification_and_repeated_calls_create_none()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        const string rejectedEmail = "rejected-worker@example.com";
        const string hiredEmail = "hired-worker@example.com";

        await Register(client, "Employer", EmployerEmail, "Hiring");
        await Register(client, "Rejected Worker", rejectedEmail, "LookingForWork");
        await Register(client, "Hired Worker", hiredEmail, "LookingForWork");
        var employerToken = await Login(client, EmployerEmail, "Hiring");
        var rejectedToken = await Login(client, rejectedEmail, "LookingForWork");
        var hiredToken = await Login(client, hiredEmail, "LookingForWork");

        client.DefaultRequestHeaders.Authorization = Bearer(employerToken);
        var job = (await (await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra")))
            .Content.ReadFromJsonAsync<JobPostResponse>())!;

        client.DefaultRequestHeaders.Authorization = Bearer(rejectedToken);
        await client.PostAsync($"/api/work/jobs/{job.Id}/apply", null);
        client.DefaultRequestHeaders.Authorization = Bearer(hiredToken);
        await client.PostAsync($"/api/work/jobs/{job.Id}/apply", null);

        client.DefaultRequestHeaders.Authorization = Bearer(employerToken);
        var applicants = (await client.GetFromJsonAsync<List<ApplicantResponse>>(
            $"/api/hiring/jobs/{job.Id}/applications"))!;
        var rejected = applicants.Single(item => item.WorkerName == "Rejected Worker");
        var hired = applicants.Single(item => item.WorkerName == "Hired Worker");

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync(
            $"/api/hiring/jobs/{job.Id}/applications/{rejected.Id}/reject", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync(
            $"/api/hiring/jobs/{job.Id}/applications/{rejected.Id}/reject", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync(
            $"/api/hiring/jobs/{job.Id}/applications/{hired.Id}/shortlist", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync(
            $"/api/hiring/jobs/{job.Id}/applications/{hired.Id}/hire", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync(
            $"/api/hiring/jobs/{job.Id}/applications/{hired.Id}/hire", null)).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(rejectedToken);
        var rejectedNotifications = (await client.GetFromJsonAsync<NotificationListResponse>(
            "/api/notifications"))!;
        var rejection = Assert.Single(
            rejectedNotifications.Items, item => item.Type == "Rejected");
        Assert.Equal("/work/applications", rejection.Link);
        Assert.DoesNotContain("rejected", rejection.Message, StringComparison.OrdinalIgnoreCase);

        client.DefaultRequestHeaders.Authorization = Bearer(hiredToken);
        var hiredNotifications = (await client.GetFromJsonAsync<NotificationListResponse>(
            "/api/notifications"))!;
        Assert.Single(hiredNotifications.Items, item => item.Type == "Shortlisted");
        var offer = Assert.Single(hiredNotifications.Items, item => item.Type == "Hired");
        Assert.Equal("/work/applications", offer.Link);
    }

    [Fact]
    public async Task Read_all_is_idempotent_scoped_and_requires_auth()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await Register(client, "Employer", EmployerEmail, "Hiring");
        await Register(client, "Worker", WorkerEmail, "LookingForWork");
        var employerToken = await Login(client, EmployerEmail, "Hiring");

        client.DefaultRequestHeaders.Authorization = Bearer(employerToken);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PutAsync("/api/notifications/read-all", null)).StatusCode);

        Guid employerId;
        Guid workerId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
            employerId = await db.Users.Where(user => user.Email == EmployerEmail).Select(user => user.Id).SingleAsync();
            workerId = await db.Users.Where(user => user.Email == WorkerEmail).Select(user => user.Id).SingleAsync();
            db.Notifications.AddRange(
                CreateNotification(employerId, 1, DateTimeOffset.UtcNow),
                CreateNotification(workerId, 2, DateTimeOffset.UtcNow));
            await db.SaveChangesAsync();
        }

        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PutAsync("/api/notifications/read-all", null)).StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
            Assert.True(await db.Notifications.Where(item => item.UserId == employerId).AllAsync(item => item.IsRead));
            Assert.True(await db.Notifications.Where(item => item.UserId == workerId).AllAsync(item => !item.IsRead));
        }

        client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PutAsync("/api/notifications/read-all", null)).StatusCode);
    }

    [Fact]
    public async Task Notifications_support_ordered_skip_pagination()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await Register(client, "Employer", EmployerEmail, "Hiring");
        var employerToken = await Login(client, EmployerEmail, "Hiring");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
            var employerId = await db.Users.Where(user => user.Email == EmployerEmail).Select(user => user.Id).SingleAsync();
            var start = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
            db.Notifications.AddRange(Enumerable.Range(0, 105)
                .Select(index => CreateNotification(employerId, index, start.AddMinutes(index))));
            await db.SaveChangesAsync();
        }

        client.DefaultRequestHeaders.Authorization = Bearer(employerToken);
        var first = await client.GetFromJsonAsync<NotificationListResponse>("/api/notifications?skip=0");
        var second = await client.GetFromJsonAsync<NotificationListResponse>("/api/notifications?skip=100");
        var beyond = await client.GetFromJsonAsync<NotificationListResponse>("/api/notifications?skip=200");

        Assert.Equal(100, first!.Items.Count);
        Assert.Equal("Notification 104", first.Items[0].Message);
        Assert.Equal("Notification 5", first.Items[^1].Message);
        Assert.Equal(105, first.UnreadCount);
        Assert.Equal(5, second!.Items.Count);
        Assert.Equal("Notification 4", second.Items[0].Message);
        Assert.Equal("Notification 0", second.Items[^1].Message);
        Assert.Empty(beyond!.Items);
    }

    private static Task<HttpResponseMessage> Register(HttpClient client, string name, string email, string role) =>
        client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(name, email, Password, role));

    private static async Task<string> Login(HttpClient client, string email, string role)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, Password, role));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    private static AuthenticationHeaderValue Bearer(string token) => new("Bearer", token);

    private static Notification CreateNotification(Guid userId, int index, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Type = "Test",
        Title = "Test notification",
        Message = $"Notification {index}",
        CreatedAt = createdAt
    };
}
