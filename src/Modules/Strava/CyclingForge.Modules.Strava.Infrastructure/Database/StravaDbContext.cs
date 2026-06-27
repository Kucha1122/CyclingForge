using CyclingForge.Modules.Strava.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Strava.Infrastructure.Database;

internal sealed class StravaDbContext : DbContext
{
    public DbSet<StravaToken> StravaTokens => Set<StravaToken>();
    public DbSet<StravaAthlete> StravaAthletes => Set<StravaAthlete>();
    public DbSet<StravaActivity> StravaActivities => Set<StravaActivity>();
    public DbSet<StravaAthleteZones> StravaAthleteZones => Set<StravaAthleteZones>();
    public DbSet<ActivitySyncFilter> ActivitySyncFilters => Set<ActivitySyncFilter>();

    public StravaDbContext(DbContextOptions<StravaDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("strava");
        modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
    }
}
