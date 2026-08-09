using System.Diagnostics;
using LocalHire.Api.Data;
using LocalHire.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace LocalHire.Api.Endpoints;

/// <summary>
/// Destructive helpers used only by the behave integration suite
/// (<c>integration-tests/</c>). They give a test run a guaranteed-clean database
/// and a cold cache before every scenario, which the suite cannot achieve on its
/// own: only the API can apply the EF Core migrations, and only the API can drop
/// its own in-process caches.
/// </summary>
/// <remarks>
/// The group is mapped only when <c>TestSupport:Enabled</c> is true AND the host
/// environment is not Production (see <see cref="IsEnabled"/>). Deployed
/// environments never set the flag, so the routes do not exist there and return
/// the SPA fallback. Never enable this against data you care about: a reset drops
/// every row.
/// </remarks>
public static class TestSupportEndpoints
{
    public const string EnabledKey = "TestSupport:Enabled";

    /// <summary>Child-first order so <c>TRUNCATE</c> stays valid without relying on CASCADE.</summary>
    private const string TableList =
        "\"Notifications\", \"SavedCandidates\", \"SavedJobs\", \"JobApplications\", \"JobPosts\", \"Users\"";

    public static bool IsEnabled(IConfiguration configuration, IHostEnvironment environment) =>
        configuration.GetValue<bool>(EnabledKey) && !environment.IsProduction();

    public static void MapTestSupportEndpoints(this WebApplication app)
    {
        var group = app
            .MapGroup("/api/test-support")
            .WithTags("Test support")
            .AllowAnonymous();

        // Rebuilds the schema (mode=recreate, the default) or empties every table
        // (mode=truncate), then drops all caches so the next read hits PostgreSQL.
        group.MapPost("/reset", async (
            string? mode,
            LocalHireDbContext database,
            IMemoryCache cache,
            JobCacheVersion cacheVersion,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var normalizedMode = mode?.Trim().ToLowerInvariant() ?? "recreate";
            if (normalizedMode is not ("recreate" or "truncate"))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["mode"] = ["Mode must be recreate or truncate."]
                });

            var stopwatch = Stopwatch.StartNew();

            if (normalizedMode == "recreate")
            {
                await database.Database.ExecuteSqlRawAsync(
                    "DROP SCHEMA public CASCADE; CREATE SCHEMA public;", ct);
                await database.Database.MigrateAsync(ct);
            }
            else
            {
                await database.Database.ExecuteSqlRawAsync(
                    $"TRUNCATE TABLE {TableList} RESTART IDENTITY CASCADE;", ct);
            }

            ClearCaches(cache, cacheVersion);
            stopwatch.Stop();

            loggerFactory
                .CreateLogger("LocalHire.TestSupport")
                .LogWarning(
                    "Test-support reset ({Mode}) completed in {ElapsedMilliseconds} ms.",
                    normalizedMode, stopwatch.ElapsedMilliseconds);

            return Results.Ok(new
            {
                mode = normalizedMode,
                elapsedMs = stopwatch.ElapsedMilliseconds
            });
        })
        .WithName("TestSupportReset");

        // Lets the suite seed rows straight into PostgreSQL and still read them
        // back through the API, which caches job and profile queries in process.
        group.MapPost("/caches/clear", (IMemoryCache cache, JobCacheVersion cacheVersion) =>
        {
            ClearCaches(cache, cacheVersion);
            return Results.NoContent();
        })
        .WithName("TestSupportClearCaches");

        group.MapGet("/ping", () => Results.Ok(new { testSupport = "enabled" }))
            .WithName("TestSupportPing");
    }

    private static void ClearCaches(IMemoryCache cache, JobCacheVersion cacheVersion)
    {
        if (cache is MemoryCache memoryCache)
            memoryCache.Clear();
        cacheVersion.Invalidate();
    }
}
