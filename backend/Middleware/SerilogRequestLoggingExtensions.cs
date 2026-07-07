using Serilog.AspNetCore;
using Serilog.Events;

namespace LocalHire.Api.Middleware;

public static class SerilogRequestLoggingExtensions
{
    // Downgrades health check request logs below the default Information level so
    // they are excluded from the console output, while keeping errors visible.
    public static void ExcludeHealthChecks(this RequestLoggingOptions options)
    {
        options.GetLevel = (httpContext, _, exception) =>
        {
            if (exception is not null || httpContext.Response.StatusCode >= 500)
                return LogEventLevel.Error;

            if (httpContext.Request.Path.StartsWithSegments("/api/health"))
                return LogEventLevel.Debug;

            if (httpContext.Response.StatusCode >= 400)
                return LogEventLevel.Warning;

            return LogEventLevel.Information;
        };
    }
}
