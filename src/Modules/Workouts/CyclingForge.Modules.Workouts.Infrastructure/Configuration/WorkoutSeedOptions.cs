namespace CyclingForge.Modules.Workouts.Infrastructure.Configuration;

public sealed class WorkoutSeedOptions
{
    public const string SectionName = "Workouts";

    public bool SeedZwiftEnabled { get; set; }
    public string? SeedZwiftFromPath { get; set; }
}
