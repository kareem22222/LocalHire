using System.Text;
using System.Threading.RateLimiting;
using Amazon.Runtime;
using Amazon.S3;
using FluentValidation;
using LocalHire.Api.Data;
using LocalHire.Api.Endpoints;
using LocalHire.Api.Middleware;
using LocalHire.Api.Services;
using LocalHire.Api.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;
using Serilog.Formatting.Json;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

// --- Logging (Serilog: JSON to console, levels from configuration) ---
builder.Host.UseSerilog((context, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .WriteTo.Console(new JsonFormatter()));

// --- Database ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is missing. Configure it in appsettings, .NET user secrets, or the ConnectionStrings__DefaultConnection environment variable.");

if (builder.Environment.IsEnvironment("Test"))
{
    builder.Services.AddDbContext<LocalHireDbContext>();
}
else
{
    builder.Services.AddDbContext<LocalHireDbContext>(options =>
        options.UseNpgsql(connectionString));
}

// --- JWT Authentication ---
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSettings = jwtSection.Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT configuration section 'Jwt' is missing.");

var invalidJwtSettings = new List<string>();

if (string.IsNullOrWhiteSpace(jwtSettings.Secret))
    invalidJwtSettings.Add("Jwt:Secret");
else if (Encoding.UTF8.GetByteCount(jwtSettings.Secret) < 32)
    invalidJwtSettings.Add("Jwt:Secret (must be at least 32 bytes)");

if (string.IsNullOrWhiteSpace(jwtSettings.Issuer))
    invalidJwtSettings.Add("Jwt:Issuer");

if (string.IsNullOrWhiteSpace(jwtSettings.Audience))
    invalidJwtSettings.Add("Jwt:Audience");

if (jwtSettings.ExpirationMinutes <= 0)
    invalidJwtSettings.Add("Jwt:ExpirationMinutes (must be greater than zero)");

if (invalidJwtSettings.Count > 0)
{
    throw new InvalidOperationException(
        $"JWT configuration is missing or invalid: {string.Join(", ", invalidJwtSettings)}. " +
        "Configure sensitive values with .NET user secrets or environment variables.");
}

builder.Services.Configure<JwtSettings>(jwtSection);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("HiringOnly", policy =>
        policy.RequireRole("Hiring"));
    options.AddPolicy("LookingForWorkOnly", policy =>
        policy.RequireRole("LookingForWork"));
});

// --- Rate Limiting ---
if (!builder.Environment.IsEnvironment("Test"))
{
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.AddPolicy(AuthEndpoints.AnonymousAuthRateLimitPolicy, context =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    AutoReplenishment = true
                }));
    });
}

// --- Caching ---
builder.Services.AddMemoryCache();

// --- Dependency Injection ---
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddSingleton<IAmazonS3>(_ =>
{
    var accessKey = builder.Configuration["AWS:AccessKey"];
    var secretKey = builder.Configuration["AWS:SecretKey"];

    if (string.IsNullOrWhiteSpace(accessKey) != string.IsNullOrWhiteSpace(secretKey))
        throw new InvalidOperationException("Configure both AWS:AccessKey and AWS:SecretKey, or neither.");

    var config = S3ConfigFactory.Build(
        builder.Configuration["AWS:ServiceUrl"],
        builder.Configuration["AWS:Region"]);

    return string.IsNullOrWhiteSpace(accessKey)
        ? new AmazonS3Client(config)
        : new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), config);
});
builder.Services.AddSingleton<JobCacheVersion>();
builder.Services.AddScoped<JobService>();
builder.Services.AddScoped<IJobService, CachedJobService>();

// --- Validation ---
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// --- Swagger ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter the token from /api/auth/login"
    });

    options.OperationFilter<RequireAuthorizationOperationFilter>();
});

var app = builder.Build();

if (!app.Environment.IsEnvironment("Test"))
{
    using var scope = app.Services.CreateScope();
    var database = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
    await database.Database.MigrateAsync();

    if (app.Environment.IsDevelopment()
        && app.Configuration.GetValue<bool>("MockData:SeedOnStartup"))
    {
        await MockDataSeeder.SeedAsync(database);
    }
}

// --- Middleware Pipeline ---
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSerilogRequestLogging(options => options.ExcludeHealthChecks());

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

if (!app.Environment.IsEnvironment("Test"))
    app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// --- Health Endpoints ---
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

// --- Auth Endpoints ---
app.MapAuthEndpoints();

// --- Profile Endpoints ---
app.MapProfileEndpoints();

// --- Job Endpoints ---
app.MapJobEndpoints();

// --- Notification Endpoints ---
app.MapNotificationEndpoints();

app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }

internal sealed class RequireAuthorizationOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var metadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;

        if (metadata.OfType<IAllowAnonymous>().Any() || !metadata.OfType<IAuthorizeData>().Any())
            return;

        operation.Security ??= new List<OpenApiSecurityRequirement>();

        var requirement = new OpenApiSecurityRequirement();
        requirement[new OpenApiSecuritySchemeReference("Bearer", context.Document)] = new List<string>();
        operation.Security.Add(requirement);
    }
}
