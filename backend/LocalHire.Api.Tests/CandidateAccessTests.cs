using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class CandidateAccessTests
{
    private const string Password = "Password1!";

    [Fact]
    public async Task Applicant_detail_is_full_and_browsed_candidate_detail_is_reduced()
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

        Guid workerId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
            var worker = db.Users.Single(user => user.Email == "worker@example.com");
            worker.AddressLine = "12 Private Road";
            worker.Gender = "Female";
            worker.DateOfBirth = new DateOnly(1995, 5, 20);
            worker.Latitude = 19.076;
            worker.Longitude = 72.878;
            worker.ResumeKey = "resumes/worker.pdf";
            worker.Credentials = [new CredentialEntry { Name = "Retail Basics", Issuer = "Skills Centre" }];
            db.SaveChanges();
            workerId = worker.Id;
        }

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "worker@example.com", "LookingForWork"));
        Assert.Equal(HttpStatusCode.Created,
            (await client.PostAsync($"/api/work/jobs/{job.Id}/apply", null)).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "owner@example.com", "Hiring"));
        var full = await client.GetFromJsonAsync<CandidateDetailResponse>($"/api/hiring/candidates/{workerId}");
        Assert.True(full!.HasApplied);
        Assert.Equal("worker@example.com", full.Email);
        Assert.Equal("12 Private Road", full.AddressLine);
        Assert.True(full.HasResume);
        Assert.Single(full.Credentials!);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "other@example.com", "Hiring"));
        var reducedResponse = await client.GetAsync($"/api/hiring/candidates/{workerId}");
        Assert.Equal(HttpStatusCode.OK, reducedResponse.StatusCode);
        var reducedJson = await reducedResponse.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(reducedJson);
        Assert.False(document.RootElement.TryGetProperty("gender", out _));
        Assert.False(document.RootElement.TryGetProperty("dateOfBirth", out _));
        Assert.False(document.RootElement.TryGetProperty("latitude", out _));
        Assert.False(document.RootElement.TryGetProperty("longitude", out _));
        var reduced = JsonSerializer.Deserialize<CandidateDetailResponse>(reducedJson,
            new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.False(reduced.HasApplied);
        Assert.Null(reduced.Email);
        Assert.Null(reduced.AddressLine);
        Assert.False(reduced.HasResume);
        Assert.Null(reduced.Credentials);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "worker@example.com", "LookingForWork"));
        var hidden = await client.PutAsJsonAsync("/api/me/profile",
            new UpdateProfileRequest("Worker", null, null, null, null, null, null, null,
                IsDiscoverable: false));
        Assert.Equal(HttpStatusCode.OK, hidden.StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "other@example.com", "Hiring"));
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hiring/candidates/{workerId}")).StatusCode);
        var search = await client.GetStringAsync("/api/hiring/candidates/nearby?search=Worker");
        Assert.DoesNotContain(workerId.ToString(), search, StringComparison.OrdinalIgnoreCase);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "owner@example.com", "Hiring"));
        Assert.Equal(HttpStatusCode.OK,
            (await client.GetAsync($"/api/hiring/candidates/{workerId}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hiring/candidates/{Guid.NewGuid()}")).StatusCode);
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
