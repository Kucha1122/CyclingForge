using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;

namespace CyclingForge.Modules.Workouts.Application.Services;

/// <summary>
/// Synthesizes a structured workout (warmup + category-specific main set + cooldown) for a target
/// category and duration, so the planner can always find a session of the right length/intensity
/// even when the curated library has no match.
/// </summary>
public interface IWorkoutGeneratorService
{
    Workout Generate(
        WorkoutCategory category,
        int targetDurationMinutes,
        FitnessLevel level,
        Guid? userId,
        DateTime now);
}
