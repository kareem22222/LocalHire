namespace LocalHire.Api.DTOs;

public sealed record ApplicantResponse(
    Guid Id,
    string WorkerName,
    string Status,
    DateTimeOffset AppliedAt
);
