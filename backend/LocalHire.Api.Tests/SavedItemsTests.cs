using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class SavedItemsTests
{
    private const string Password = "Password1!";

    [Fact]
    public async Task Saved_candidates_are_idempotent_scoped_and_only_removed_by_the_owner()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "Owner", "owner@example.com", "Hiring");
        await Register(client, "Other", "other@example.com", "Hiring");
        await Register(client, "Worker", "worker@example.com", "LookingForWork");

        Guid workerId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
            workerId = db.Users.Single(user => user.Email == "worker@example.com").Id;
        }

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "owner@example.com", "Hiring"));
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsync($"/api/hiring/saved-candidates/{workerId}", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsync($"/api/hiring/saved-candidates/{workerId}", null)).StatusCode);
        Assert.Equal([workerId], (await client.GetFromJsonAsync<Guid[]>("/api/hiring/saved-candidates"))!);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "other@example.com", "Hiring"));
        Assert.Empty((await client.GetFromJsonAsync<Guid[]>("/api/hiring/saved-candidates"))!);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"/api/hiring/saved-candidates/{workerId}")).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "owner@example.com", "Hiring"));
        Assert.Equal([workerId], (await client.GetFromJsonAsync<Guid[]>("/api/hiring/saved-candidates"))!);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"/api/hiring/saved-candidates/{workerId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"/api/hiring/saved-candidates/{workerId}")).StatusCode);
    }

    [Fact]
    public async Task Saved_jobs_are_idempotent_scoped_and_only_removed_by_the_owner()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "Employer", "employer@example.com", "Hiring");
        await Register(client, "Worker", "worker@example.com", "LookingForWork");
        await Register(client, "Other", "other@example.com", "LookingForWork");

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "employer@example.com", "Hiring"));
        var create = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra"));
        create.EnsureSuccessStatusCode();
        var jobId = (await create.Content.ReadFromJsonAsync<JobPostResponse>())!.Id;

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "worker@example.com", "LookingForWork"));
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsync($"/api/work/saved-jobs/{jobId}", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsync($"/api/work/saved-jobs/{jobId}", null)).StatusCode);
        Assert.Equal([jobId], (await client.GetFromJsonAsync<Guid[]>("/api/work/saved-jobs"))!);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "other@example.com", "LookingForWork"));
        Assert.Empty((await client.GetFromJsonAsync<Guid[]>("/api/work/saved-jobs"))!);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"/api/work/saved-jobs/{jobId}")).StatusCode);

        client.DefaultRequestHeaders.Authorization = Bearer(await Login(client, "worker@example.com", "LookingForWork"));
        Assert.Equal([jobId], (await client.GetFromJsonAsync<Guid[]>("/api/work/saved-jobs"))!);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"/api/work/saved-jobs/{jobId}")).StatusCode);
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
