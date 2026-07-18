using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class SecurityHardeningTests
{
    private const string Password = "Password1!";

    [Fact]
    public async Task Anonymous_health_is_available_with_security_headers()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").Single());
    }

    [Fact]
    public async Task Anonymous_database_health_is_unauthorized()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health/database");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Tampered_token_is_unauthorized()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var token = await Register(client, "worker-token@example.com", "LookingForWork");
        var tamperedToken = token.ToCharArray();
        var signatureIndex = token.LastIndexOf('.') + 1;
        tamperedToken[signatureIndex] = tamperedToken[signatureIndex] == 'A' ? 'B' : 'A';
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", new string(tamperedToken));

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Wrong_role_is_forbidden()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var token = await Register(client, "worker-role@example.com", "LookingForWork");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/hiring/jobs");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Application_exception_uses_problem_details()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        const string email = "duplicate@example.com";
        await Register(client, email, "Hiring");

        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest("Person", email, Password, "Hiring"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal((int)HttpStatusCode.Conflict, problem?.Status);
        Assert.Equal("A user with this email and role already exists.", problem?.Detail);
    }

    private static async Task<string> Register(HttpClient client, string email, string role)
    {
        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest("Person", email, Password, role));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }
}
