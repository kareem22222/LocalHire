namespace LocalHire.Api.Middleware;

public abstract class AppException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public sealed class ConflictException(string message)
    : AppException(message, StatusCodes.Status409Conflict);

public sealed class BadRequestException(string message)
    : AppException(message, StatusCodes.Status400BadRequest);

public sealed class UnauthorizedException(string message)
    : AppException(message, StatusCodes.Status401Unauthorized);

public sealed class NotFoundException(string message)
    : AppException(message, StatusCodes.Status404NotFound);
