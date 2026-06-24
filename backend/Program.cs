using System.Text;
using FluentValidation;
using LocalHire.Api.Data;
using LocalHire.Api.Endpoints;
using LocalHire.Api.Middleware;
using LocalHire.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// --- Database ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is missing. Configure it in appsettings, .NET user secrets, or the ConnectionStrings__DefaultConnection environment variable.");

builder.Services.AddDbContext<LocalHireDbContext>(options =>
    options.UseNpgsql(connectionString));

// --- JWT Authentication ---
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.Configure<JwtSettings>(jwtSection);

var jwtSettings = jwtSection.Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT configuration section 'Jwt' is missing.");

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

builder.Services.AddAuthorization();

// --- Caching ---
builder.Services.AddMemoryCache();

// --- Dependency Injection ---
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();

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

    options.AddSecurityRequirement(document =>
    {
        var requirement = new OpenApiSecurityRequirement();
        requirement[new OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>();
        return requirement;
    });
});

var app = builder.Build();

// --- Middleware Pipeline ---
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

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

app.MapFallbackToFile("index.html");

app.Run();
