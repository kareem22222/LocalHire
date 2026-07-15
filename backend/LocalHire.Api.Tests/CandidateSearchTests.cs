using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class CandidateSearchTests
{
    private const string Password = "Password1!";

    [Fact]
    public async Task Candidate_search_defaults_to_state_and_a_typed_term_overrides_location()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await RegisterAndAuthenticateEmployer(client);

        // Set the employer's state so the default talent list is state-scoped.
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/me/profile",
            new UpdateProfileRequest("Boss", null, null, null, null, "Indiranagar", "Karnataka", "560038"))).StatusCode);

        // JobTitle isn't settable through the profile API, so seed workers directly.
        SeedWorkers(factory);

        // 1) No coordinates and no term -> only workers in the employer's state.
        var byState = await GetCandidates(client, "/api/hiring/candidates/nearby");
        Assert.NotEmpty(byState);
        Assert.All(byState, c => Assert.Equal("Karnataka", c.State));
        Assert.Contains(byState, c => c.Pincode == "560038");
        Assert.DoesNotContain(byState, c => c.Pincode == "500081");

        // 2) A far pincode still surfaces because a typed term overrides the state default.
        var byPincode = await GetCandidates(client, "/api/hiring/candidates/nearby?search=500081");
        Assert.Contains(byPincode, c => c.Pincode == "500081");

        // 3) Searching by state name works too.
        var byStateName = await GetCandidates(client, "/api/hiring/candidates/nearby?search=telangana");
        Assert.Contains(byStateName, c => c.State == "Telangana");

        // 4) Role filter combined with the state default returns only that role in-state.
        var byRole = await GetCandidates(client, "/api/hiring/candidates/nearby?role=Driver");
        Assert.NotEmpty(byRole);
        Assert.All(byRole, c => Assert.Equal("Driver", c.Role));
        Assert.All(byRole, c => Assert.Equal("Karnataka", c.State));
    }

    [Fact]
    public async Task Candidate_search_ranks_by_distance_and_keeps_far_and_locationless_matches()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await RegisterAndAuthenticateEmployer(client);
        SeedWorkers(factory);

        // Coordinates without a term restrict results to the local radius (Bengaluru).
        var byRadius = await GetCandidates(client, "/api/hiring/candidates/nearby?lat=12.97&lng=77.64");
        Assert.Contains(byRadius, c => c.Pincode == "560038");
        Assert.DoesNotContain(byRadius, c => c.Pincode == "500081");
        Assert.All(byRadius, c => Assert.NotNull(c.DistanceKm));

        // Coordinates + a term: the far Hyderabad match still surfaces, with a real distance.
        var radiusPlusSearch = await GetCandidates(client, "/api/hiring/candidates/nearby?lat=12.97&lng=77.64&search=500081");
        var hyderabad = radiusPlusSearch.Single(c => c.Pincode == "500081");
        Assert.NotNull(hyderabad.DistanceKm);
        Assert.True(hyderabad.DistanceKm > 50);

        // A matching worker without coordinates is still returned, with a null distance.
        var noCoords = await GetCandidates(client, "/api/hiring/candidates/nearby?lat=12.97&lng=77.64&search=nocoords");
        var floater = noCoords.Single(c => c.Name == "No Coords Worker");
        Assert.Null(floater.DistanceKm);
    }

    [Fact]
    public async Task Nearby_candidate_search_returns_only_the_60_nearest_workers()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await RegisterAndAuthenticateEmployer(client);
        SeedNearbyWorkers(factory, 65);

        var candidates = await GetCandidates(client, "/api/hiring/candidates/nearby?lat=12.97&lng=77.64");

        Assert.Equal(60, candidates.Count);
        Assert.Equal("Nearby Worker 0", candidates[0].Name);
        Assert.DoesNotContain(candidates, candidate => candidate.Name == "Nearby Worker 64");
        Assert.All(candidates, candidate => Assert.NotNull(candidate.DistanceKm));
        Assert.True(candidates.Zip(candidates.Skip(1), (a, b) => a.DistanceKm <= b.DistanceKm).All(x => x));
    }

    [Fact]
    public async Task Candidate_search_validates_coordinates_and_requires_hiring_role()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Boss", "boss@example.com", Password, "Hiring"));
        await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Worker", "worker@example.com", Password, "LookingForWork"));

        var hiringToken = await Login(client, "boss@example.com", "Hiring");
        var workerToken = await Login(client, "worker@example.com", "LookingForWork");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", hiringToken);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/hiring/candidates/nearby?lat=12.97")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/hiring/candidates/nearby?lat=91&lng=0")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/hiring/candidates/nearby")).StatusCode);

        // Workers cannot use the hiring talent search.
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", workerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/hiring/candidates/nearby")).StatusCode);
    }

    private static async Task RegisterAndAuthenticateEmployer(HttpClient client)
    {
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Boss", "boss@example.com", Password, "Hiring"))).StatusCode);
        var token = await Login(client, "boss@example.com", "Hiring");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private static async Task<string> Login(HttpClient client, string email, string role)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, Password, role));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
    }

    private static async Task<List<CandidateResponse>> GetCandidates(HttpClient client, string url) =>
        (await client.GetFromJsonAsync<List<CandidateResponse>>(url))!;

    private static void SeedWorkers(ApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
        var now = DateTimeOffset.UtcNow;

        db.Users.AddRange(
            Worker("w1@ex.com", "Bengaluru Cashier", "Cashier", "Indiranagar", "Karnataka", "560038", 12.9719, 77.6412, now),
            Worker("w2@ex.com", "Hyderabad Driver", "Driver", "Hitech City", "Telangana", "500081", 17.4435, 78.3772, now),
            Worker("w3@ex.com", "Bengaluru Driver", "Driver", "Koramangala", "Karnataka", "560034", 12.9352, 77.6245, now),
            Worker("w4@ex.com", "No Coords Worker", "Cashier", "Whitefield", "Karnataka", "nocoords", null, null, now));

        db.SaveChanges();
    }

    private static void SeedNearbyWorkers(ApiFactory factory, int count)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
        var now = DateTimeOffset.UtcNow;

        db.Users.AddRange(Enumerable.Range(0, count).Select(i =>
            Worker($"nearby-{i}@ex.com", $"Nearby Worker {i}", "Cashier", "Indiranagar",
                "Karnataka", $"560{i:D3}", 12.97 + i * 0.001, 77.64, now)));

        db.SaveChanges();
    }

    private static User Worker(
        string email, string name, string title, string area, string state,
        string pincode, double? lat, double? lng, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = name,
            Email = email,
            PasswordHash = "x",
            Role = UserRole.LookingForWork,
            JobTitle = title,
            CityArea = area,
            State = state,
            Pincode = pincode,
            Latitude = lat,
            Longitude = lng,
            CreatedAt = now,
        };
}
