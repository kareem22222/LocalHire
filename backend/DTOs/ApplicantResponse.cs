namespace LocalHire.Api.DTOs;

/// <summary>
/// An applicant surfaced to a hiring employer on a job's applicant/shortlist
/// summary. Carries just enough worker profile detail to render a candidate card
/// and link through to the full candidate detail page. Deliberately excludes the
/// worker's phone number, which is only revealed via the "Contact" action on the
/// detail page.
/// </summary>
public sealed record ApplicantResponse(
    Guid Id,
    Guid WorkerId,
    string WorkerName,
    string? Role,
    string? Area,
    string? State,
    string? Pincode,
    string Status,
    DateTimeOffset AppliedAt
);
