using CyclingForge.Modules.Activities.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Activities.Infrastructure.Database;

internal sealed class ActivitiesDbContext : DbContext
{
    public DbSet<Activity> Activities => Set<Activity>();

    public ActivitiesDbContext(DbContextOptions<ActivitiesDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("activities");
        modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
    }
}
