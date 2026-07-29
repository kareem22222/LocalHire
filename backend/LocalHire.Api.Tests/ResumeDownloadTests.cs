using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class ResumeDownloadTests
{
    private const string Password = "Password1!";

    [Fact]
    public async Task Worker_can_download_own_resume_but_missing_and_anonymous_requests_are_rejected()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me/resume")).StatusCode);
        await Register(client, "Worker", "worker@example.com", "LookingForWork");
        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "worker@example.com", "LookingForWork"));
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/me/resume")).StatusCode);

        SetResume(factory, "worker@example.com", "worker-resume.pdf");
        var response = await client.GetAsync("/api/me/resume");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var download = (await response.Content.ReadFromJsonAsync<ResumeDownloadResponse>())!;
        Assert.Equal("worker-resume.pdf", download.FileName);
        Assert.Equal("browser-localstack", new Uri(download.Url).Host);
        var decodedUrl = Uri.UnescapeDataString(download.Url);
        Assert.Contains("localhire-test-resumes", decodedUrl);
        Assert.Contains("response-content-type=application/pdf", decodedUrl);
        Assert.Contains("response-content-disposition=attachment", decodedUrl);
    }

    [Fact]
    public async Task Only_the_owning_employer_can_download_an_applicants_resume()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "Owner", "owner@example.com", "Hiring");
        await Register(client, "Other", "other@example.com", "Hiring");
        await Register(client, "Worker", "worker@example.com", "LookingForWork");

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "owner@example.com", "Hiring"));
        var create = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra"));
        create.EnsureSuccessStatusCode();
        var job = (await create.Content.ReadFromJsonAsync<JobPostResponse>())!;
        var workerId = SetResume(factory, "worker@example.com", "applicant.docx");

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "worker@example.com", "LookingForWork"));
        Assert.Equal(HttpStatusCode.Created,
            (await client.PostAsync($"/api/work/jobs/{job.Id}/apply", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.GetAsync($"/api/hiring/candidates/{workerId}/resume")).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "other@example.com", "Hiring"));
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hiring/candidates/{workerId}/resume")).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "owner@example.com", "Hiring"));
        var allowed = await client.GetFromJsonAsync<ResumeDownloadResponse>(
            $"/api/hiring/candidates/{workerId}/resume");
        Assert.Equal("applicant.docx", allowed!.FileName);

        SetResume(factory, "worker@example.com", null);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hiring/candidates/{workerId}/resume")).StatusCode);
    }

    private static Guid SetResume(ApiFactory factory, string email, string? fileName)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
        var worker = db.Users.Single(user => user.Email == email);
        worker.ResumeKey = fileName is null ? null : $"resumes/{worker.Id}/current";
        worker.ResumeFileName = fileName;
        db.SaveChanges();
        return worker.Id;
    }

    private static Task<HttpResponseMessage> Register(
        HttpClient client, string name, string email, string role) =>
        client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(name, email, Password, role));

    private static async Task<string> Login(HttpClient client, string email, string role)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, Password, role));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    private static AuthenticationHeaderValue Bearer(string token) => new("Bearer", token);
}
