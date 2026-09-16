using LocalHire.Api.Data;
using LocalHire.Api.DTOs;
using LocalHire.Api.Middleware;
using LocalHire.Api.Models;
using LocalHire.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class IncrementThreeTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private LocalHireDbContext _db = null!;
    private JobService _jobs = null!;
    private User _employer = null!;
    private User _worker = null!;
    private JobPost _job = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new LocalHireDbContext(new DbContextOptionsBuilder<LocalHireDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
        _jobs = new JobService(_db, new CandidateAccessPolicy(_db), new NotificationService(_db));
        _employer = User("employer", UserRole.Hiring);
        _worker = User("worker", UserRole.LookingForWork);
        _job = Job(_employer.Id, "Cashier", SalaryPeriod.Monthly, 20_000, 30_000, 2);
        _db.AddRange(_employer, _worker, _job);
        await _db.SaveChangesAsync();
    }

    [Fact]
    public async Task Withdrawal_is_owner_only_idempotent_and_terminal()
    {
        var application = await _jobs.ApplyAsync(_job.Id, _worker.Id, CancellationToken.None);

        var first = await _jobs.WithdrawApplicationAsync(application.Id, _worker.Id, CancellationToken.None);
        var second = await _jobs.WithdrawApplicationAsync(application.Id, _worker.Id, CancellationToken.None);

        Assert.Equal("Withdrawn", first.Status);
        Assert.Equal("Withdrawn", second.Status);
        Assert.Single(await _db.Notifications.Where(item => item.Type == "ApplicationWithdrawn").ToListAsync());
        Assert.Single(await _db.EmailOutboxMessages.Where(item => item.DedupeKey == $"application:{application.Id}:Withdrawn").ToListAsync());
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _jobs.WithdrawApplicationAsync(application.Id, Guid.NewGuid(), CancellationToken.None));
        await Assert.ThrowsAsync<ConflictException>(() =>
            _jobs.SetApplicationStatusAsync(_job.Id, application.Id, ApplicationStatus.Shortlisted, _employer.Id, CancellationToken.None));
    }

    [Fact]
    public async Task Invitation_keeps_contact_private_until_worker_applies()
    {
        var invitation = await _jobs.CreateInvitationAsync(_worker.Id, _job.Id, _employer.Id, CancellationToken.None);
        var before = await _jobs.GetCandidateDetailAsync(_worker.Id, _employer.Id, CancellationToken.None);

        await Assert.ThrowsAsync<ConflictException>(() =>
            _jobs.CreateInvitationAsync(_worker.Id, _job.Id, _employer.Id, CancellationToken.None));
        await _jobs.ApplyAsync(_job.Id, _worker.Id, CancellationToken.None);
        var stored = await _db.CandidateInvitations.FindAsync(invitation.Id);
        var after = await _jobs.GetCandidateDetailAsync(_worker.Id, _employer.Id, CancellationToken.None);

        Assert.False(before.HasApplied);
        Assert.Null(before.Email);
        Assert.Single(await _db.EmailOutboxMessages.Where(item => item.DedupeKey == $"invitation:{invitation.Id}").ToListAsync());
        Assert.Equal(InvitationStatus.Accepted, stored!.Status);
        Assert.True(after.HasApplied);
        Assert.Equal(_worker.Email, after.Email);
    }

    [Fact]
    public async Task Appointment_requires_other_participant_confirmation_and_withdrawal_cancels_it()
    {
        var application = await _jobs.ApplyAsync(_job.Id, _worker.Id, CancellationToken.None);
        var proposal = await _jobs.SetAppointmentAsync(
            application.Id,
            new AppointmentRequest(DateTimeOffset.UtcNow.AddDays(1), "UTC", "Main shop", null, null),
            _employer.Id, UserRole.Hiring, CancellationToken.None);

        await Assert.ThrowsAsync<ConflictException>(() => _jobs.ConfirmAppointmentAsync(
            application.Id, _employer.Id, UserRole.Hiring, CancellationToken.None));
        var confirmed = await _jobs.ConfirmAppointmentAsync(
            application.Id, _worker.Id, UserRole.LookingForWork, CancellationToken.None);
        await _jobs.WithdrawApplicationAsync(application.Id, _worker.Id, CancellationToken.None);
        var cancelled = await _jobs.GetAppointmentAsync(
            application.Id, _employer.Id, UserRole.Hiring, CancellationToken.None);

        Assert.Equal("Proposed", proposal.Status);
        Assert.Equal("Confirmed", confirmed.Status);
        Assert.Equal("Cancelled", cancelled!.Status);
        await Assert.ThrowsAsync<ConflictException>(() => _jobs.SetAppointmentAsync(
            application.Id,
            new AppointmentRequest(DateTimeOffset.UtcNow.AddDays(2), "UTC", "Main shop", null, null),
            _employer.Id, UserRole.Hiring, CancellationToken.None));
    }

    [Fact]
    public async Task Filters_compare_only_the_selected_salary_period_and_include_unspecified_experience()
    {
        _db.JobPosts.AddRange(
            Job(_employer.Id, "Hourly", SalaryPeriod.Hourly, 100, 200, null),
            Job(_employer.Id, "Senior monthly", SalaryPeriod.Monthly, 25_000, 35_000, 5));
        await _db.SaveChangesAsync();

        var result = await _jobs.SearchJobsAsync(
            null, null, null, null, 25_000, 40_000, SalaryPeriod.Monthly, 2, null,
            _worker.Id, new PagingRequest(1, 20), CancellationToken.None);

        Assert.Single(result.Items);
        Assert.Equal("Cashier", result.Items[0].Title);
    }

    private static User User(string name, UserRole role) => new()
    {
        Id = Guid.NewGuid(), Name = name, Email = $"{name}@example.com", PasswordHash = "hash",
        Role = role, IsDiscoverable = true, State = "Karnataka", CreatedAt = DateTimeOffset.UtcNow
    };

    private static JobPost Job(
        Guid employerId, string title, SalaryPeriod period, decimal min, decimal max, int? experience) => new()
    {
        Id = Guid.NewGuid(), EmployerId = employerId, Title = title, Description = title,
        WorkplaceName = "Local shop", CityArea = "Bengaluru", State = "Karnataka",
        SalaryPeriod = period, SalaryMin = min, SalaryMax = max, ExperienceMinYears = experience,
        IsActive = true, CreatedAt = DateTimeOffset.UtcNow
    };

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }
}
