using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LocalHire.Api.Data;

public sealed class LocalHireDbContext(DbContextOptions<LocalHireDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<JobPost> JobPosts => Set<JobPost>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => new { u.Email, u.Role }).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(256);
            entity.Property(u => u.Name).HasMaxLength(100);
            entity.Property(u => u.PasswordHash).HasMaxLength(256);
            entity.Property(u => u.Role).HasMaxLength(50).IsRequired().HasConversion<string>();
            entity.Property(u => u.Latitude).IsRequired(false);
            entity.Property(u => u.Longitude).IsRequired(false);
            entity.Property(u => u.LocationUpdatedAt).IsRequired(false);
        });

        modelBuilder.Entity<JobPost>(entity =>
        {
            entity.HasKey(j => j.Id);
            entity.Property(j => j.Title).HasMaxLength(200).IsRequired();
            entity.Property(j => j.Description).HasMaxLength(2000).IsRequired();
            entity.Property(j => j.WorkplaceName).HasMaxLength(200).IsRequired();
            entity.Property(j => j.CityArea).HasMaxLength(200).IsRequired();

            entity.HasOne(j => j.Employer)
                .WithMany(u => u.JobPosts)
                .HasForeignKey(j => j.EmployerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Status)
                .HasMaxLength(50)
                .HasConversion<string>();

            entity.HasIndex(a => new { a.JobPostId, a.WorkerId }).IsUnique();

            entity.HasOne(a => a.JobPost)
                .WithMany(j => j.Applications)
                .HasForeignKey(a => a.JobPostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.Worker)
                .WithMany(u => u.JobApplications)
                .HasForeignKey(a => a.WorkerId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
