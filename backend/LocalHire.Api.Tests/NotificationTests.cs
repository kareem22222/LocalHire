using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.DTOs;
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
        Assert.Contains("Worker applied", applicationNotification.Message);

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

    private static Task<HttpResponseMessage> Register(HttpClient client, string name, string email, string role) =>
        client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(name, email, Password, role));

    private static async Task<string> Login(HttpClient client, string email, string role)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, Password, role));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    private static AuthenticationHeaderValue Bearer(string token) => new("Bearer", token);
}
