namespace LocalHire.Api.DTOs;

public sealed record CreateInvitationRequest(Guid JobPostId);

public sealed record InvitationResponse(
    Guid Id,
    Guid JobPostId,
    string JobTitle,
    string WorkplaceName,
    string Status,
    DateTimeOffset CreatedAt);

public sealed record AppointmentRequest(
    DateTimeOffset StartsAt,
    string TimeZone,
    string? Venue,
    string? MeetingUrl,
    string? Notes);

public sealed record AppointmentResponse(
    Guid Id,
    Guid ApplicationId,
    Guid ProposedById,
    DateTimeOffset StartsAt,
    string TimeZone,
    string? Venue,
    string? MeetingUrl,
    string? Notes,
    string Status,
    DateTimeOffset UpdatedAt);

public sealed record BusinessProfileResponse(
    Guid EmployerId,
    string Name,
    string? Description,
    string? Location,
    string? Contact);
