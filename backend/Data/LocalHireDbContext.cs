using Microsoft.EntityFrameworkCore;

namespace LocalHire.Api.Data;

public sealed class LocalHireDbContext(DbContextOptions<LocalHireDbContext> options)
    : DbContext(options);
