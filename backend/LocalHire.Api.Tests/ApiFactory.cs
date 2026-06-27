using LocalHire.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LocalHire.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"localhire-{Guid.NewGuid()}";
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
            services.RemoveAll<DbContextOptions<LocalHireDbContext>>();
            services.AddDbContext<LocalHireDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));
        });
    }
}