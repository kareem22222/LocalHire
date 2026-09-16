using System.Net;
using System.Net.Mail;
using LocalHire.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LocalHire.Api.Services;

public sealed class EmailOptions
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? UserName { get; set; }
    public string? Password { get; set; }
    public string From { get; set; } = "no-reply@localhire.invalid";
    public string PublicBaseUrl { get; set; } = "http://localhost:5173";
    public bool EnableSsl { get; set; } = true;
}

public sealed class EmailOutboxWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<EmailOptions> options,
    ILogger<EmailOutboxWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        do
        {
            await DeliverAsync(stoppingToken);
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task DeliverAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(options.Value.Host))
            return;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LocalHireDbContext>();
        var now = DateTimeOffset.UtcNow;
        var messages = await db.EmailOutboxMessages
            .Include(message => message.User)
            .Where(message => message.SentAt == null && message.NextAttemptAt <= now)
            .OrderBy(message => message.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        foreach (var message in messages)
        {
            var claimed = await db.EmailOutboxMessages
                .Where(item => item.Id == message.Id && item.SentAt == null && item.NextAttemptAt <= now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.NextAttemptAt, now.AddMinutes(5))
                    .SetProperty(item => item.Attempts, item => item.Attempts + 1), ct);
            if (claimed == 0)
                continue;
            message.NextAttemptAt = now.AddMinutes(5);
            message.Attempts++;

            if (!message.User.EmailNotificationsEnabled)
            {
                message.SentAt = now;
                message.LastError = "Suppressed by notification preference.";
                continue;
            }

            try
            {
                using var smtp = new SmtpClient(options.Value.Host, options.Value.Port)
                {
                    EnableSsl = options.Value.EnableSsl,
                    Credentials = string.IsNullOrWhiteSpace(options.Value.UserName)
                        ? CredentialCache.DefaultNetworkCredentials
                        : new NetworkCredential(options.Value.UserName, options.Value.Password)
                };
                using var mail = new MailMessage(
                    options.Value.From,
                    message.User.Email,
                    message.Subject,
                    BuildBody(message.Body, message.Link));
                await smtp.SendMailAsync(mail, ct);
                message.SentAt = DateTimeOffset.UtcNow;
                message.LastError = null;
            }
            catch (Exception exception) when (exception is SmtpException or IOException)
            {
                message.LastError = exception.Message;
                message.NextAttemptAt = DateTimeOffset.UtcNow.AddMinutes(Math.Min(60, 1 << Math.Min(message.Attempts, 5)));
                logger.LogWarning(exception, "Email delivery failed for outbox message {MessageId}", message.Id);
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private string BuildBody(string body, string? link) => string.IsNullOrWhiteSpace(link)
        ? body
        : $"{body}{Environment.NewLine}{Environment.NewLine}{options.Value.PublicBaseUrl.TrimEnd('/')}/{link.TrimStart('/')}";
}
