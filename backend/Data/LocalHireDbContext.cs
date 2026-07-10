using System.Text.Json;
using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace LocalHire.Api.Data;

public sealed class LocalHireDbContext(DbContextOptions<LocalHireDbContext> options)
    : DbContext(options)
{
    private const string CoordinateCheck =
        """("Latitude" IS NULL AND "Longitude" IS NULL) OR ("Latitude" BETWEEN -90.0 AND 90.0 AND "Longitude" BETWEEN -180.0 AND 180.0)""";

    public DbSet<User> Users => Set<User>();
    public DbSet<JobPost> JobPosts => Set<JobPost>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasAlternateKey(u => new { u.Id, u.Role });
            entity.HasIndex(u => new { u.Email, u.Role }).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(256);
            entity.Property(u => u.Name).HasMaxLength(100);
            entity.Property(u => u.PasswordHash).HasMaxLength(256);
            entity.Property(u => u.Role).HasMaxLength(50).IsRequired().HasConversion<string>();
            entity.Property(u => u.Phone).HasMaxLength(30).IsRequired(false);
            entity.Property(u => u.DateOfBirth).IsRequired(false);
            entity.Property(u => u.Gender).HasMaxLength(50).IsRequired(false);
            entity.Property(u => u.AddressLine).HasMaxLength(300).IsRequired(false);
            entity.Property(u => u.CityArea).HasMaxLength(200).IsRequired(false);
            entity.Property(u => u.State).HasMaxLength(100).IsRequired(false);
            entity.Property(u => u.Pincode).HasMaxLength(6).IsRequired(false);
            entity.Property(u => u.Latitude).IsRequired(false);
            entity.Property(u => u.Longitude).IsRequired(false);
            entity.Property(u => u.LocationUpdatedAt).IsRequired(false);
            entity.ToTable(t => t.HasCheckConstraint("CK_Users_Location_CompleteAndValid", CoordinateCheck));
        });

        modelBuilder.Entity<JobPost>(entity =>
        {
            var stringListConverter = new ValueConverter<List<string>, string>(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => string.IsNullOrEmpty(v)
                    ? new List<string>()
                    : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

            var stringListComparer = new ValueComparer<List<string>>(
                (a, b) => (a ?? new List<string>()).SequenceEqual(b ?? new List<string>()),
                v => v == null ? 0 : v.Aggregate(0, (acc, s) => HashCode.Combine(acc, s)),
                v => v == null ? new List<string>() : v.ToList());

            entity.HasKey(j => j.Id);
            entity.Property(j => j.EmployerRole)
                .HasMaxLength(50)
                .IsRequired()
                .HasConversion<string>()
                .HasDefaultValue(UserRole.Hiring);
            entity.Property(j => j.Title).HasMaxLength(200).IsRequired();
            entity.Property(j => j.Description).HasMaxLength(2000).IsRequired();
            entity.Property(j => j.WorkplaceName).HasMaxLength(200).IsRequired();
            entity.Property(j => j.CityArea).HasMaxLength(200).IsRequired();
            entity.Property(j => j.State).HasMaxLength(100).IsRequired(false);
            entity.Property(j => j.Pincode).HasMaxLength(6).IsRequired(false);
            entity.Property(j => j.IsActive).HasDefaultValue(true);
            entity.Property(j => j.Latitude).IsRequired(false);
            entity.Property(j => j.Longitude).IsRequired(false);

            // Role details
            entity.Property(j => j.EmploymentType).HasMaxLength(50).HasConversion<string>().IsRequired(false);
            entity.Property(j => j.SalaryPeriod).HasMaxLength(50).HasConversion<string>().IsRequired(false);
            entity.Property(j => j.SalaryMin).HasPrecision(12, 2).IsRequired(false);
            entity.Property(j => j.SalaryMax).HasPrecision(12, 2).IsRequired(false);
            entity.Property(j => j.MinEducation).HasMaxLength(200).IsRequired(false);
            entity.Property(j => j.ExperienceMinYears).IsRequired(false);
            entity.Property(j => j.ExperienceMaxYears).IsRequired(false);
            entity.Property(j => j.WorkingDays).HasMaxLength(200).IsRequired(false);
            entity.Property(j => j.ShiftStartTime).IsRequired(false);
            entity.Property(j => j.ShiftEndTime).IsRequired(false);
            entity.Property(j => j.Openings).IsRequired(false);

            entity.Property(j => j.RequiredSkills)
                .HasConversion(stringListConverter)
                .Metadata.SetValueComparer(stringListComparer);
            entity.Property(j => j.Languages)
                .HasConversion(stringListConverter)
                .Metadata.SetValueComparer(stringListComparer);
            entity.Property(j => j.Benefits)
                .HasConversion(stringListConverter)
                .Metadata.SetValueComparer(stringListComparer);

            entity.ToTable(t => t.HasCheckConstraint("CK_JobPosts_Location_CompleteAndValid", CoordinateCheck));

            entity.HasOne(j => j.Employer)
                .WithMany(u => u.JobPosts)
                .HasForeignKey(j => new { j.EmployerId, j.EmployerRole })
                .HasPrincipalKey(u => new { u.Id, u.Role })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Status)
                .HasMaxLength(50)
                .HasConversion<string>();
            entity.Property(a => a.WorkerRole)
                .HasMaxLength(50)
                .IsRequired()
                .HasConversion<string>()
                .HasDefaultValue(UserRole.LookingForWork);

            entity.HasIndex(a => new { a.JobPostId, a.WorkerId }).IsUnique();

            entity.HasOne(a => a.JobPost)
                .WithMany(j => j.Applications)
                .HasForeignKey(a => a.JobPostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.Worker)
                .WithMany(u => u.JobApplications)
                .HasForeignKey(a => new { a.WorkerId, a.WorkerRole })
                .HasPrincipalKey(u => new { u.Id, u.Role })
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
