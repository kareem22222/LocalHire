using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LocalHire.Api.Data;

public sealed class LocalHireDbContext(DbContextOptions<LocalHireDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(256);
            entity.Property(u => u.Name).HasMaxLength(100);
            entity.Property(u => u.PasswordHash).HasMaxLength(256);
        });
    }
}
