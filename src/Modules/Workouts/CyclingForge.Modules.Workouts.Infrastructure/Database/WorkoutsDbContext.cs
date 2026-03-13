using CyclingForge.Modules.Workouts.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Workouts.Infrastructure.Database;

internal sealed class WorkoutsDbContext : DbContext
{
    public DbSet<Workout> Workouts => Set<Workout>();
    public DbSet<WorkoutStep> WorkoutSteps => Set<WorkoutStep>();
    public DbSet<TrainingPreference> TrainingPreferences => Set<TrainingPreference>();
    public DbSet<DailyRecommendation> DailyRecommendations => Set<DailyRecommendation>();

    public WorkoutsDbContext(DbContextOptions<WorkoutsDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("workouts");
        modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
    }
}
