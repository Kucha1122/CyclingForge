using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;

namespace CyclingForge.Modules.Workouts.Application.Services;

public sealed class WorkoutGeneratorService : IWorkoutGeneratorService
{
    public Workout Generate(
        WorkoutCategory category,
        int targetDurationMinutes,
        FitnessLevel level,
        Guid? userId,
        DateTime now)
    {
        var targetSeconds = Math.Max(20 * 60, targetDurationMinutes * 60);

        var warmupSec = Math.Clamp((int)(targetSeconds * 0.10), 300, 900);
        var cooldownSec = Math.Clamp((int)(targetSeconds * 0.08), 300, 600);
        var mainSec = Math.Max(300, targetSeconds - warmupSec - cooldownSec);

        var workout = Workout.Create(
            userId,
            $"{CategoryLabel(category)} {targetDurationMinutes}min",
            $"Auto-generated {CategoryLabel(category)} session (~{targetDurationMinutes} min).",
            category,
            WorkoutSource.Generated,
            ZoneFor(category),
            isPublic: false,
            tags: $"generated,{category.ToString().ToLowerInvariant()}",
            now);

        var order = 0;
        var (mainLow, _) = SteadyPowerRange(category);

        // Warmup: ramp from easy up to the lower edge of the main effort.
        workout.AddStep(WorkoutStep.Create(workout.Id, ++order, StepType.Warmup, warmupSec, 0.45m, Math.Max(0.55m, mainLow - 0.05m)));

        foreach (var step in BuildMainSet(workout.Id, category, level, mainSec, ref order))
            workout.AddStep(step);

        // Cooldown: ramp back down to easy.
        workout.AddStep(WorkoutStep.Create(workout.Id, ++order, StepType.Cooldown, cooldownSec, 0.55m, 0.40m));

        return workout;
    }

    private static IEnumerable<WorkoutStep> BuildMainSet(
        Guid workoutId, WorkoutCategory category, FitnessLevel level, int mainSec, ref int order)
    {
        var steps = new List<WorkoutStep>();

        if (category is WorkoutCategory.Recovery or WorkoutCategory.Endurance or WorkoutCategory.Tempo)
        {
            var (_, power) = SteadyPowerRange(category);
            steps.Add(WorkoutStep.Create(workoutId, ++order, StepType.SteadyState, mainSec, power, power));
            return steps;
        }

        // Interval categories: pick a realistic "gold standard" set rather than piling on reps.
        // Extra duration is filled with Z2 endurance, never with extra hard reps.
        var templates = IntervalTemplates(category);
        var chosen = templates[0];
        foreach (var t in templates)
        {
            if (HardSetSeconds(t) <= mainSec)
                chosen = t;
        }

        var onPower = level == FitnessLevel.Beginner ? chosen.OnPower - 0.05m : chosen.OnPower;
        var hardSet = HardSetSeconds(chosen);
        var residual = mainSec - hardSet;

        // Aerobic padding before the hard set to reach the target duration.
        if (residual >= 300)
            steps.Add(WorkoutStep.Create(workoutId, ++order, StepType.SteadyState, residual, 0.65m, 0.65m));

        steps.Add(WorkoutStep.Create(
            workoutId, ++order, StepType.Intervals,
            durationSeconds: 0,
            powerLow: chosen.OffPower,
            powerHigh: onPower,
            repeat: chosen.Reps,
            onDurationSeconds: chosen.OnSec,
            offDurationSeconds: chosen.OffSec,
            onPower: onPower,
            offPower: chosen.OffPower));

        return steps;
    }

    private readonly record struct IntervalTemplate(int Reps, int OnSec, int OffSec, decimal OnPower, decimal OffPower);

    private static int HardSetSeconds(IntervalTemplate t) => t.Reps * (t.OnSec + t.OffSec);

    // Gold-standard interval sets per category, ordered ascending by total hard-set time. The
    // largest set that fits the available time is used; the rest is padded with Z2 endurance.
    private static IReadOnlyList<IntervalTemplate> IntervalTemplates(WorkoutCategory category) => category switch
    {
        WorkoutCategory.Threshold => new[]
        {
            new IntervalTemplate(2, 1200, 300, 0.98m, 0.55m), // 2x20
            new IntervalTemplate(3, 900, 300, 0.98m, 0.55m),  // 3x15
            new IntervalTemplate(3, 1200, 300, 0.98m, 0.55m), // 3x20
        },
        WorkoutCategory.SweetSpot or WorkoutCategory.Mixed => new[]
        {
            new IntervalTemplate(3, 900, 300, 0.90m, 0.55m),  // 3x15
            new IntervalTemplate(3, 1200, 300, 0.90m, 0.55m), // 3x20
            new IntervalTemplate(4, 900, 300, 0.90m, 0.55m),  // 4x15
        },
        WorkoutCategory.VO2Max => new[]
        {
            new IntervalTemplate(4, 240, 240, 1.13m, 0.50m),  // 4x4
            new IntervalTemplate(5, 240, 180, 1.13m, 0.50m),  // 5x4
            new IntervalTemplate(4, 360, 240, 1.13m, 0.50m),  // 4x6
            new IntervalTemplate(5, 360, 240, 1.13m, 0.50m),  // 5x6
        },
        WorkoutCategory.Anaerobic => new[]
        {
            new IntervalTemplate(5, 60, 180, 1.30m, 0.45m),
            new IntervalTemplate(6, 60, 180, 1.30m, 0.45m),
            new IntervalTemplate(8, 60, 150, 1.30m, 0.45m),
        },
        WorkoutCategory.Sprint => new[]
        {
            new IntervalTemplate(6, 20, 160, 1.50m, 0.40m),
            new IntervalTemplate(8, 20, 160, 1.50m, 0.40m),
            new IntervalTemplate(10, 20, 180, 1.50m, 0.40m),
        },
        _ => new[] { new IntervalTemplate(3, 900, 300, 0.90m, 0.55m) }
    };

    // Steady-state power (lower edge, target) as a fraction of FTP.
    private static (decimal Low, decimal Power) SteadyPowerRange(WorkoutCategory category) => category switch
    {
        WorkoutCategory.Recovery => (0.45m, 0.50m),
        WorkoutCategory.Endurance => (0.60m, 0.68m),
        WorkoutCategory.Tempo => (0.76m, 0.82m),
        WorkoutCategory.SweetSpot => (0.84m, 0.90m),
        WorkoutCategory.Threshold => (0.90m, 0.98m),
        WorkoutCategory.VO2Max => (0.85m, 1.12m),
        WorkoutCategory.Anaerobic => (0.80m, 1.30m),
        WorkoutCategory.Sprint => (0.80m, 1.50m),
        _ => (0.84m, 0.90m)
    };

    private static TrainingZone ZoneFor(WorkoutCategory category) => category switch
    {
        WorkoutCategory.Recovery => TrainingZone.Z1,
        WorkoutCategory.Endurance => TrainingZone.Z2,
        WorkoutCategory.Tempo => TrainingZone.Z3,
        WorkoutCategory.SweetSpot => TrainingZone.Z3,
        WorkoutCategory.Threshold => TrainingZone.Z4,
        WorkoutCategory.VO2Max => TrainingZone.Z5,
        WorkoutCategory.Anaerobic => TrainingZone.Z6,
        WorkoutCategory.Sprint => TrainingZone.Z6,
        _ => TrainingZone.Z4
    };

    private static string CategoryLabel(WorkoutCategory category) => category switch
    {
        WorkoutCategory.SweetSpot => "Sweet Spot",
        WorkoutCategory.VO2Max => "VO2 Max",
        _ => category.ToString()
    };
}
