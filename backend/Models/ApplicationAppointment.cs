namespace LocalHire.Api.Models;

public enum AppointmentStatus
{
    Proposed,
    Confirmed,
    Cancelled
}

public sealed class ApplicationAppointment
{
    public Guid Id { get; set; }
    public Guid JobApplicationId { get; set; }
    public Guid ProposedById { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public required string TimeZone { get; set; }
    public string? Venue { get; set; }
    public string? MeetingUrl { get; set; }
    public string? Notes { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Proposed;
    public DateTimeOffset UpdatedAt { get; set; }

    public JobApplication JobApplication { get; set; } = null!;
}
