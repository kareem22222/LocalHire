var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new
{
    service = "LocalHire",
    status = "healthy",
    timestamp = DateTimeOffset.UtcNow
}));

app.MapFallbackToFile("index.html");

app.Run();

