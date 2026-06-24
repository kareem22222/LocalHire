using LocalHire.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is missing. Configure it in appsettings, .NET user secrets, or the ConnectionStrings__DefaultConnection environment variable.");

builder.Services.AddDbContext<LocalHireDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new
{
    service = "LocalHire",
    status = "healthy",
    timestamp = DateTimeOffset.UtcNow
}))
.WithName("GetServiceHealth")
.WithTags("Health")
.Produces(StatusCodes.Status200OK);

app.MapGet("/api/health/database", async (
    LocalHireDbContext database,
    ILoggerFactory loggerFactory,
    CancellationToken cancellationToken) =>
{
    try
    {
        var canConnect = await database.Database.CanConnectAsync(cancellationToken);

        if (canConnect)
        {
            return Results.Ok(new
            {
                database = "PostgreSQL",
                status = "connected",
                timestamp = DateTimeOffset.UtcNow
            });
        }

        loggerFactory
            .CreateLogger("LocalHire.DatabaseHealth")
            .LogWarning("PostgreSQL health check could not establish a connection.");

        return Results.Problem(
            title: "Database connection failed",
            detail: "The API could not connect to PostgreSQL. Check the database host, port, credentials, database name, and SSL settings.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (Exception exception)
    {
        loggerFactory
            .CreateLogger("LocalHire.DatabaseHealth")
            .LogError(exception, "PostgreSQL health check failed.");

        return Results.Problem(
            title: "Database connection failed",
            detail: "The API could not connect to PostgreSQL. Check the database host, port, credentials, database name, and SSL settings.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
})
.WithName("GetDatabaseHealth")
.WithTags("Health")
.Produces(StatusCodes.Status200OK)
.ProducesProblem(StatusCodes.Status503ServiceUnavailable);

app.MapFallbackToFile("index.html");

app.Run();
