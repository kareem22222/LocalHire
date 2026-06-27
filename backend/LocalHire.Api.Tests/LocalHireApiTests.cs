using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.DTOs;
using LocalHire.Api.Validators;
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
            .Validate(new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", 91, 0))
            .IsValid);

        Assert.False(new UpdateLocationRequestValidator()
            .Validate(new UpdateLocationRequest(91, 181))
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

        var wrongPassword = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("person@example.com", Password + "x", "Hiring"));
        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
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
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", 0, 0));
        Assert.Equal(HttpStatusCode.Created, createJob.StatusCode);
        var job = await createJob.Content.ReadFromJsonAsync<JobPostResponse>();

        var createFarJob = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Remote cashier", "Back office", "Far Shop", "Far Town", 80, 0));
        Assert.Equal(HttpStatusCode.Created, createFarJob.StatusCode);

        var badJob = await client.PostAsJsonAsync("/api/hiring/jobs",
            new CreateJobPostRequest("Cashier", "Front desk", "Corner Shop", "Bandra", 91, 0));
        Assert.Equal(HttpStatusCode.BadRequest, badJob.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/hiring/jobs")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/me/location", new UpdateLocationRequest(0, 0))).StatusCode);

        var nearby = await client.GetFromJsonAsync<List<JobPostResponse>>("/api/work/jobs/nearby?lat=0&lng=0");
        Assert.Equal(job!.Id, nearby![0].Id);

        var badLocation = await client.PutAsJsonAsync("/api/me/location", new UpdateLocationRequest(91, 0));
        Assert.Equal(HttpStatusCode.BadRequest, badLocation.StatusCode);

        Assert.Equal(HttpStatusCode.Created, (await client.PostAsync($"/api/work/jobs/{job!.Id}/apply", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync($"/api/work/jobs/{job.Id}/apply", null)).StatusCode);
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