using CyclingForge.Modules.Garmin.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Garmin.Infrastructure.Database;

internal sealed class GarminDbContext : DbContext
{
    public DbSet<GarminToken> GarminTokens => Set<GarminToken>();
    public DbSet<GarminSleepData> GarminSleepData => Set<GarminSleepData>();
    public DbSet<GarminDailyWellness> GarminDailyWellness => Set<GarminDailyWellness>();

    public GarminDbContext(DbContextOptions<GarminDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("garmin");
        modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
    }
}
