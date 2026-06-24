using LocalHire.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is missing. Set ConnectionStrings__DefaultConnection.");

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
        await database.Database.OpenConnectionAsync(cancellationToken);
        await database.Database.CloseConnectionAsync();

        return Results.Ok(new
        {
            database = "PostgreSQL",
            status = "connected",
            timestamp = DateTimeOffset.UtcNow
        });
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
