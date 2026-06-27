using LocalHire.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LocalHire.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=localhire_tests",
                ["Jwt:Issuer"] = "LocalHire.Tests",
                ["Jwt:Audience"] = "LocalHire.Tests",
                ["Jwt:Secret"] = "test-secret-with-at-least-thirty-two-bytes",
                ["Jwt:ExpirationMinutes"] = "60",
            });
        });

        builder.ConfigureServices(services =>
        {
            _connection.Open();
            using var command = _connection.CreateCommand();
            command.CommandText = "PRAGMA foreign_keys=ON;";
            command.ExecuteNonQuery();

            services.RemoveAll<DbContextOptions<LocalHireDbContext>>();
            services.AddDbContext<LocalHireDbContext>(options =>
                options.UseSqlite(_connection));

            using var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            scope.ServiceProvider.GetRequiredService<LocalHireDbContext>().Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
            _connection.Dispose();
    }
}