using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Infrastructure.Configuration;
using CyclingForge.Modules.Workouts.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CyclingForge.Modules.Workouts.Infrastructure.Services;

public static class WorkoutSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<WorkoutsDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<WorkoutsDbContext>>();

        if (await context.Workouts.AnyAsync(w => w.Source == WorkoutSource.System))
        {
            logger.LogInformation("System workouts already seeded. Skipping.");
            return;
        }

        logger.LogInformation("Seeding system workouts...");

        var workouts = CreateSystemWorkouts();
        await context.Workouts.AddRangeAsync(workouts);
        await context.SaveChangesAsync();

        logger.LogInformation("Seeded {Count} system workouts.", workouts.Count);

        var options = scope.ServiceProvider.GetRequiredService<IOptions<WorkoutSeedOptions>>().Value;
        if (options.SeedZwiftEnabled && !string.IsNullOrWhiteSpace(options.SeedZwiftFromPath))
        {
            var zwiftSeedService = scope.ServiceProvider.GetRequiredService<IZwiftSeedService>();
            var zwiftCount = await zwiftSeedService.SeedFromPathAsync(options.SeedZwiftFromPath);
            if (zwiftCount > 0)
                logger.LogInformation("Seeded {Count} Zwift workouts from ZWO directory.", zwiftCount);
        }
    }

    private static List<Workout> CreateSystemWorkouts()
    {
        var now = DateTime.UtcNow;
        var workouts = new List<Workout>();

        workouts.AddRange(CreateRecoveryWorkouts(now));
        workouts.AddRange(CreateEnduranceWorkouts(now));
        workouts.AddRange(CreateTempoWorkouts(now));
        workouts.AddRange(CreateSweetSpotWorkouts(now));
        workouts.AddRange(CreateThresholdWorkouts(now));
        workouts.AddRange(CreateVO2MaxWorkouts(now));
        workouts.AddRange(CreateAnaerobicWorkouts(now));
        workouts.AddRange(CreateSprintWorkouts(now));
        workouts.AddRange(CreateMixedWorkouts(now));

        return workouts;
    }

    private static List<Workout> CreateRecoveryWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("Easy Spin", "Very easy spinning to promote recovery", WorkoutCategory.Recovery, TrainingZone.Z1, 30, "recovery,easy", now,
                (StepType.Warmup, 300, 0.30m, 0.45m),
                (StepType.SteadyState, 1200, 0.45m, 0.45m),
                (StepType.Cooldown, 300, 0.45m, 0.30m)),

            BuildWorkout("Recovery Ride", "Light recovery ride with gentle spinning", WorkoutCategory.Recovery, TrainingZone.Z1, 45, "recovery,easy", now,
                (StepType.Warmup, 300, 0.25m, 0.45m),
                (StepType.SteadyState, 2100, 0.50m, 0.50m),
                (StepType.Cooldown, 300, 0.45m, 0.25m)),

            BuildWorkout("Active Recovery", "Active recovery with short openers", WorkoutCategory.Recovery, TrainingZone.Z1, 40, "recovery,openers", now,
                (StepType.Warmup, 300, 0.30m, 0.50m),
                (StepType.SteadyState, 600, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 0.80m, 0.80m),
                (StepType.SteadyState, 270, 0.45m, 0.45m),
                (StepType.SteadyState, 30, 0.80m, 0.80m),
                (StepType.SteadyState, 870, 0.45m, 0.45m),
                (StepType.Cooldown, 300, 0.45m, 0.30m)),

            BuildWorkout("Gentle Pedal", "Very easy 60min recovery spin", WorkoutCategory.Recovery, TrainingZone.Z1, 60, "recovery,long", now,
                (StepType.Warmup, 300, 0.25m, 0.45m),
                (StepType.SteadyState, 3000, 0.48m, 0.48m),
                (StepType.Cooldown, 300, 0.45m, 0.25m)),

            BuildWorkout("Flush Ride", "Short flush ride to clear legs", WorkoutCategory.Recovery, TrainingZone.Z1, 20, "recovery,short", now,
                (StepType.Warmup, 180, 0.30m, 0.45m),
                (StepType.SteadyState, 840, 0.45m, 0.45m),
                (StepType.Cooldown, 180, 0.45m, 0.30m)),
        ];
    }

    private static List<Workout> CreateEnduranceWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("Endurance Builder", "Steady Z2 endurance ride", WorkoutCategory.Endurance, TrainingZone.Z2, 60, "endurance,base", now,
                (StepType.Warmup, 600, 0.40m, 0.65m),
                (StepType.SteadyState, 2400, 0.68m, 0.68m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Long Endurance", "90min base building ride", WorkoutCategory.Endurance, TrainingZone.Z2, 90, "endurance,base,long", now,
                (StepType.Warmup, 600, 0.40m, 0.65m),
                (StepType.SteadyState, 4200, 0.70m, 0.70m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Endurance Ramp", "Progressive endurance with ramp finish", WorkoutCategory.Endurance, TrainingZone.Z2, 60, "endurance,progressive", now,
                (StepType.Warmup, 600, 0.40m, 0.60m),
                (StepType.SteadyState, 1200, 0.65m, 0.65m),
                (StepType.Ramp, 1200, 0.65m, 0.75m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Z2 Foundation", "Solid 75min Z2 foundation ride", WorkoutCategory.Endurance, TrainingZone.Z2, 75, "endurance,foundation", now,
                (StepType.Warmup, 600, 0.40m, 0.65m),
                (StepType.SteadyState, 3300, 0.68m, 0.68m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Base Miles", "2hr base ride for aerobic development", WorkoutCategory.Endurance, TrainingZone.Z2, 120, "endurance,base,long", now,
                (StepType.Warmup, 600, 0.40m, 0.65m),
                (StepType.SteadyState, 6000, 0.67m, 0.67m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Coffee Ride", "Easy social-pace endurance", WorkoutCategory.Endurance, TrainingZone.Z2, 45, "endurance,easy", now,
                (StepType.Warmup, 300, 0.40m, 0.60m),
                (StepType.SteadyState, 2100, 0.62m, 0.62m),
                (StepType.Cooldown, 300, 0.60m, 0.40m)),

            BuildWorkout("Endurance Steady", "Solid 60min at upper Z2", WorkoutCategory.Endurance, TrainingZone.Z2, 60, "endurance,upper", now,
                (StepType.Warmup, 600, 0.40m, 0.65m),
                (StepType.SteadyState, 2400, 0.73m, 0.73m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Easy Aerobic", "Low-intensity aerobic development", WorkoutCategory.Endurance, TrainingZone.Z2, 50, "endurance,aerobic", now,
                (StepType.Warmup, 600, 0.40m, 0.60m),
                (StepType.SteadyState, 2100, 0.63m, 0.63m),
                (StepType.Cooldown, 300, 0.60m, 0.40m)),
        ];
    }

    private static List<Workout> CreateTempoWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("Tempo Blocks", "3x10min tempo with recovery", WorkoutCategory.Tempo, TrainingZone.Z3, 60, "tempo,blocks", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 600, 0.82m, 0.82m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.82m, 0.82m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.82m, 0.82m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Sustained Tempo", "20min sustained tempo effort", WorkoutCategory.Tempo, TrainingZone.Z3, 45, "tempo,sustained", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 1200, 0.80m, 0.80m),
                (StepType.Cooldown, 900, 0.65m, 0.40m)),

            BuildWorkout("Tempo Progression", "Progressively harder tempo", WorkoutCategory.Tempo, TrainingZone.Z3, 60, "tempo,progressive", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 600, 0.78m, 0.78m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.82m, 0.82m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.85m, 0.85m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Tempo with Surges", "Tempo blocks with power surges", WorkoutCategory.Tempo, TrainingZone.Z3, 50, "tempo,surges", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 480, 0.80m, 0.80m),
                (StepType.SteadyState, 30, 1.10m, 1.10m),
                (StepType.SteadyState, 480, 0.80m, 0.80m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 480, 0.80m, 0.80m),
                (StepType.SteadyState, 30, 1.10m, 1.10m),
                (StepType.SteadyState, 480, 0.80m, 0.80m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Quick Tempo", "Short 30min tempo session", WorkoutCategory.Tempo, TrainingZone.Z3, 30, "tempo,short", now,
                (StepType.Warmup, 300, 0.40m, 0.70m),
                (StepType.SteadyState, 1200, 0.82m, 0.82m),
                (StepType.Cooldown, 300, 0.65m, 0.40m)),

            BuildWorkout("Long Tempo", "2x20min tempo efforts", WorkoutCategory.Tempo, TrainingZone.Z3, 75, "tempo,long", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 1200, 0.81m, 0.81m),
                (StepType.SteadyState, 600, 0.55m, 0.55m),
                (StepType.SteadyState, 1200, 0.83m, 0.83m),
                (StepType.Cooldown, 900, 0.65m, 0.40m)),
        ];
    }

    private static List<Workout> CreateSweetSpotWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("Sweet Spot Classic", "3x10min sweet spot intervals", WorkoutCategory.SweetSpot, TrainingZone.Z3, 60, "sweetspot,classic", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 600, 0.90m, 0.90m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.90m, 0.90m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.90m, 0.90m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),

            BuildWorkout("Sweet Spot 2x20", "2x20min at sweet spot", WorkoutCategory.SweetSpot, TrainingZone.Z3, 75, "sweetspot,long", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 1200, 0.88m, 0.88m),
                (StepType.SteadyState, 600, 0.55m, 0.55m),
                (StepType.SteadyState, 1200, 0.90m, 0.90m),
                (StepType.Cooldown, 900, 0.65m, 0.40m)),

            BuildWorkout("Sweet Spot Progression", "SST blocks increasing power", WorkoutCategory.SweetSpot, TrainingZone.Z3, 60, "sweetspot,progressive", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 480, 0.86m, 0.86m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 480, 0.89m, 0.89m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 480, 0.92m, 0.92m),
                (StepType.Cooldown, 960, 0.65m, 0.40m)),

            BuildWorkout("Over/Under Sweet Spot", "Sweet spot with over-unders", WorkoutCategory.SweetSpot, TrainingZone.Z4, 60, "sweetspot,over-under", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 300, 0.88m, 0.88m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 300, 0.88m, 0.88m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 300, 0.88m, 0.88m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 300, 0.88m, 0.88m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 300, 0.88m, 0.88m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 300, 0.88m, 0.88m),
                (StepType.Cooldown, 420, 0.65m, 0.40m)),

            BuildWorkout("Short Sweet Spot", "Quick SST session", WorkoutCategory.SweetSpot, TrainingZone.Z3, 40, "sweetspot,short", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 600, 0.89m, 0.89m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.91m, 0.91m),
                (StepType.Cooldown, 300, 0.65m, 0.40m)),

            BuildWorkout("Marathon Sweet Spot", "Long sweet spot for endurance", WorkoutCategory.SweetSpot, TrainingZone.Z3, 90, "sweetspot,long,endurance", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 900, 0.88m, 0.88m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 900, 0.89m, 0.89m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 900, 0.90m, 0.90m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 900, 0.91m, 0.91m),
                (StepType.Cooldown, 300, 0.65m, 0.40m)),
        ];
    }

    private static List<Workout> CreateThresholdWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("FTP Intervals", "4x8min at threshold", WorkoutCategory.Threshold, TrainingZone.Z4, 60, "threshold,ftp", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 480, 0.97m, 0.97m),
                (StepType.SteadyState, 240, 0.55m, 0.55m),
                (StepType.SteadyState, 480, 0.98m, 0.98m),
                (StepType.SteadyState, 240, 0.55m, 0.55m),
                (StepType.SteadyState, 480, 0.99m, 0.99m),
                (StepType.SteadyState, 240, 0.55m, 0.55m),
                (StepType.SteadyState, 480, 1.00m, 1.00m),
                (StepType.Cooldown, 360, 0.65m, 0.40m)),

            BuildWorkout("2x20 Threshold", "Classic 2x20 at threshold", WorkoutCategory.Threshold, TrainingZone.Z4, 75, "threshold,classic", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 1200, 0.95m, 0.95m),
                (StepType.SteadyState, 600, 0.55m, 0.55m),
                (StepType.SteadyState, 1200, 0.97m, 0.97m),
                (StepType.Cooldown, 900, 0.65m, 0.40m)),

            BuildWorkout("Over-Unders", "Over/under threshold intervals", WorkoutCategory.Threshold, TrainingZone.Z4, 60, "threshold,over-under", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 180, 0.92m, 0.92m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 180, 0.92m, 0.92m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 180, 0.92m, 0.92m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.SteadyState, 180, 0.92m, 0.92m),
                (StepType.SteadyState, 120, 1.05m, 1.05m),
                (StepType.Cooldown, 660, 0.65m, 0.40m)),

            BuildWorkout("Threshold Ramp", "Progressive threshold intervals", WorkoutCategory.Threshold, TrainingZone.Z4, 50, "threshold,ramp", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.Ramp, 600, 0.88m, 1.00m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.Ramp, 600, 0.88m, 1.02m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.Ramp, 600, 0.88m, 1.05m),
                (StepType.Cooldown, 300, 0.65m, 0.40m)),

            BuildWorkout("Short Threshold", "3x5min at FTP", WorkoutCategory.Threshold, TrainingZone.Z4, 35, "threshold,short", now,
                (StepType.Warmup, 420, 0.40m, 0.70m),
                (StepType.SteadyState, 300, 0.98m, 0.98m),
                (StepType.SteadyState, 180, 0.55m, 0.55m),
                (StepType.SteadyState, 300, 1.00m, 1.00m),
                (StepType.SteadyState, 180, 0.55m, 0.55m),
                (StepType.SteadyState, 300, 1.02m, 1.02m),
                (StepType.Cooldown, 420, 0.65m, 0.40m)),

            BuildWorkout("FTP Builder", "Long threshold development", WorkoutCategory.Threshold, TrainingZone.Z4, 90, "threshold,long,ftp", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 720, 0.95m, 0.95m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 720, 0.96m, 0.96m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 720, 0.97m, 0.97m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 720, 0.98m, 0.98m),
                (StepType.Cooldown, 600, 0.65m, 0.40m)),
        ];
    }

    private static List<Workout> CreateVO2MaxWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("VO2Max 5x3min", "Classic 5x3min VO2max intervals", WorkoutCategory.VO2Max, TrainingZone.Z5, 45, "vo2max,classic", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 180, 1.15m, 1.15m),
                (StepType.SteadyState, 180, 0.50m, 0.50m),
                (StepType.SteadyState, 180, 1.15m, 1.15m),
                (StepType.SteadyState, 180, 0.50m, 0.50m),
                (StepType.SteadyState, 180, 1.15m, 1.15m),
                (StepType.SteadyState, 180, 0.50m, 0.50m),
                (StepType.SteadyState, 180, 1.15m, 1.15m),
                (StepType.SteadyState, 180, 0.50m, 0.50m),
                (StepType.SteadyState, 180, 1.15m, 1.15m),
                (StepType.Cooldown, 480, 0.60m, 0.40m)),

            BuildWorkout("VO2Max 4x4min", "4x4min VO2max with 4min rest", WorkoutCategory.VO2Max, TrainingZone.Z5, 50, "vo2max,long-intervals", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 240, 1.12m, 1.12m),
                (StepType.SteadyState, 240, 0.50m, 0.50m),
                (StepType.SteadyState, 240, 1.13m, 1.13m),
                (StepType.SteadyState, 240, 0.50m, 0.50m),
                (StepType.SteadyState, 240, 1.14m, 1.14m),
                (StepType.SteadyState, 240, 0.50m, 0.50m),
                (StepType.SteadyState, 240, 1.15m, 1.15m),
                (StepType.Cooldown, 480, 0.60m, 0.40m)),

            BuildWorkout("Short VO2Max", "8x1min at 120% FTP", WorkoutCategory.VO2Max, TrainingZone.Z5, 35, "vo2max,short,high-power", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 60, 1.20m, 1.20m),
                (StepType.SteadyState, 90, 0.50m, 0.50m),
                (StepType.SteadyState, 60, 1.20m, 1.20m),
                (StepType.SteadyState, 90, 0.50m, 0.50m),
                (StepType.SteadyState, 60, 1.20m, 1.20m),
                (StepType.SteadyState, 90, 0.50m, 0.50m),
                (StepType.SteadyState, 60, 1.20m, 1.20m),
                (StepType.SteadyState, 90, 0.50m, 0.50m),
                (StepType.SteadyState, 60, 1.20m, 1.20m),
                (StepType.SteadyState, 90, 0.50m, 0.50m),
                (StepType.SteadyState, 60, 1.20m, 1.20m),
                (StepType.SteadyState, 90, 0.50m, 0.50m),
                (StepType.SteadyState, 60, 1.20m, 1.20m),
                (StepType.SteadyState, 90, 0.50m, 0.50m),
                (StepType.SteadyState, 60, 1.20m, 1.20m),
                (StepType.Cooldown, 420, 0.60m, 0.40m)),

            BuildWorkout("VO2Max Pyramid", "Pyramid VO2max intervals", WorkoutCategory.VO2Max, TrainingZone.Z5, 50, "vo2max,pyramid", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 60, 1.15m, 1.15m),
                (StepType.SteadyState, 60, 0.50m, 0.50m),
                (StepType.SteadyState, 120, 1.15m, 1.15m),
                (StepType.SteadyState, 120, 0.50m, 0.50m),
                (StepType.SteadyState, 180, 1.15m, 1.15m),
                (StepType.SteadyState, 180, 0.50m, 0.50m),
                (StepType.SteadyState, 240, 1.15m, 1.15m),
                (StepType.SteadyState, 240, 0.50m, 0.50m),
                (StepType.SteadyState, 180, 1.15m, 1.15m),
                (StepType.SteadyState, 180, 0.50m, 0.50m),
                (StepType.SteadyState, 120, 1.15m, 1.15m),
                (StepType.SteadyState, 120, 0.50m, 0.50m),
                (StepType.SteadyState, 60, 1.15m, 1.15m),
                (StepType.Cooldown, 420, 0.60m, 0.40m)),

            BuildWorkout("Billats", "30/30s VO2max intervals", WorkoutCategory.VO2Max, TrainingZone.Z5, 40, "vo2max,billats,30-30", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.SteadyState, 30, 1.20m, 1.20m), (StepType.SteadyState, 30, 0.50m, 0.50m),
                (StepType.Cooldown, 600, 0.60m, 0.40m)),
        ];
    }

    private static List<Workout> CreateAnaerobicWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("Anaerobic Blasts", "6x30s at 150% FTP", WorkoutCategory.Anaerobic, TrainingZone.Z6, 35, "anaerobic,sprints", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 30, 1.50m, 1.50m),
                (StepType.SteadyState, 150, 0.45m, 0.45m),
                (StepType.SteadyState, 30, 1.50m, 1.50m),
                (StepType.SteadyState, 150, 0.45m, 0.45m),
                (StepType.SteadyState, 30, 1.50m, 1.50m),
                (StepType.SteadyState, 150, 0.45m, 0.45m),
                (StepType.SteadyState, 30, 1.50m, 1.50m),
                (StepType.SteadyState, 150, 0.45m, 0.45m),
                (StepType.SteadyState, 30, 1.50m, 1.50m),
                (StepType.SteadyState, 150, 0.45m, 0.45m),
                (StepType.SteadyState, 30, 1.50m, 1.50m),
                (StepType.Cooldown, 420, 0.60m, 0.40m)),

            BuildWorkout("Tabata Power", "4min Tabata - 20s on/10s off x 8", WorkoutCategory.Anaerobic, TrainingZone.Z6, 25, "anaerobic,tabata", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 20, 1.70m, 1.70m), (StepType.SteadyState, 10, 0.40m, 0.40m),
                (StepType.SteadyState, 20, 1.70m, 1.70m), (StepType.SteadyState, 10, 0.40m, 0.40m),
                (StepType.SteadyState, 20, 1.70m, 1.70m), (StepType.SteadyState, 10, 0.40m, 0.40m),
                (StepType.SteadyState, 20, 1.70m, 1.70m), (StepType.SteadyState, 10, 0.40m, 0.40m),
                (StepType.SteadyState, 20, 1.70m, 1.70m), (StepType.SteadyState, 10, 0.40m, 0.40m),
                (StepType.SteadyState, 20, 1.70m, 1.70m), (StepType.SteadyState, 10, 0.40m, 0.40m),
                (StepType.SteadyState, 20, 1.70m, 1.70m), (StepType.SteadyState, 10, 0.40m, 0.40m),
                (StepType.SteadyState, 20, 1.70m, 1.70m), (StepType.SteadyState, 10, 0.40m, 0.40m),
                (StepType.Cooldown, 600, 0.60m, 0.40m)),

            BuildWorkout("Anaerobic Capacity", "2min efforts at 130% FTP", WorkoutCategory.Anaerobic, TrainingZone.Z6, 45, "anaerobic,capacity", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 120, 1.30m, 1.30m),
                (StepType.SteadyState, 240, 0.45m, 0.45m),
                (StepType.SteadyState, 120, 1.30m, 1.30m),
                (StepType.SteadyState, 240, 0.45m, 0.45m),
                (StepType.SteadyState, 120, 1.30m, 1.30m),
                (StepType.SteadyState, 240, 0.45m, 0.45m),
                (StepType.SteadyState, 120, 1.30m, 1.30m),
                (StepType.Cooldown, 660, 0.60m, 0.40m)),
        ];
    }

    private static List<Workout> CreateSprintWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("Sprint Development", "Sprint efforts with full recovery", WorkoutCategory.Sprint, TrainingZone.Z6, 40, "sprint,power", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 10, 2.00m, 2.00m),
                (StepType.SteadyState, 290, 0.45m, 0.45m),
                (StepType.SteadyState, 10, 2.00m, 2.00m),
                (StepType.SteadyState, 290, 0.45m, 0.45m),
                (StepType.SteadyState, 10, 2.00m, 2.00m),
                (StepType.SteadyState, 290, 0.45m, 0.45m),
                (StepType.SteadyState, 10, 2.00m, 2.00m),
                (StepType.SteadyState, 290, 0.45m, 0.45m),
                (StepType.SteadyState, 10, 2.00m, 2.00m),
                (StepType.SteadyState, 290, 0.45m, 0.45m),
                (StepType.SteadyState, 10, 2.00m, 2.00m),
                (StepType.Cooldown, 300, 0.60m, 0.40m)),

            BuildWorkout("Race Simulation Sprints", "Sprint efforts from tempo", WorkoutCategory.Sprint, TrainingZone.Z6, 50, "sprint,race-sim", now,
                (StepType.Warmup, 600, 0.40m, 0.75m),
                (StepType.SteadyState, 300, 0.80m, 0.80m),
                (StepType.SteadyState, 15, 1.80m, 1.80m),
                (StepType.SteadyState, 285, 0.50m, 0.50m),
                (StepType.SteadyState, 300, 0.80m, 0.80m),
                (StepType.SteadyState, 15, 1.80m, 1.80m),
                (StepType.SteadyState, 285, 0.50m, 0.50m),
                (StepType.SteadyState, 300, 0.80m, 0.80m),
                (StepType.SteadyState, 15, 1.80m, 1.80m),
                (StepType.Cooldown, 600, 0.60m, 0.40m)),
        ];
    }

    private static List<Workout> CreateMixedWorkouts(DateTime now)
    {
        return
        [
            BuildWorkout("Kitchen Sink", "All zones workout", WorkoutCategory.Mixed, TrainingZone.Z4, 60, "mixed,all-zones", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 300, 0.70m, 0.70m),
                (StepType.SteadyState, 300, 0.82m, 0.82m),
                (StepType.SteadyState, 300, 0.90m, 0.90m),
                (StepType.SteadyState, 300, 1.00m, 1.00m),
                (StepType.SteadyState, 120, 1.15m, 1.15m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 300, 0.90m, 0.90m),
                (StepType.SteadyState, 300, 1.00m, 1.00m),
                (StepType.SteadyState, 120, 1.15m, 1.15m),
                (StepType.Cooldown, 360, 0.65m, 0.40m)),

            BuildWorkout("Endurance + Sprints", "Z2 ride with sprint bursts", WorkoutCategory.Mixed, TrainingZone.Z2, 60, "mixed,endurance,sprints", now,
                (StepType.Warmup, 600, 0.40m, 0.65m),
                (StepType.SteadyState, 600, 0.68m, 0.68m),
                (StepType.SteadyState, 10, 1.50m, 1.50m),
                (StepType.SteadyState, 590, 0.68m, 0.68m),
                (StepType.SteadyState, 10, 1.50m, 1.50m),
                (StepType.SteadyState, 590, 0.68m, 0.68m),
                (StepType.SteadyState, 10, 1.50m, 1.50m),
                (StepType.SteadyState, 590, 0.68m, 0.68m),
                (StepType.Cooldown, 300, 0.60m, 0.40m)),

            BuildWorkout("Sweet Spot to VO2", "SST with VO2max finishers", WorkoutCategory.Mixed, TrainingZone.Z5, 60, "mixed,sweetspot,vo2max", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 600, 0.88m, 0.88m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.90m, 0.90m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 120, 1.15m, 1.15m),
                (StepType.SteadyState, 120, 0.50m, 0.50m),
                (StepType.SteadyState, 120, 1.15m, 1.15m),
                (StepType.Cooldown, 540, 0.60m, 0.40m)),

            BuildWorkout("Race Prep", "Threshold + sprint simulation", WorkoutCategory.Mixed, TrainingZone.Z4, 75, "mixed,race,prep", now,
                (StepType.Warmup, 600, 0.40m, 0.70m),
                (StepType.SteadyState, 600, 0.95m, 0.95m),
                (StepType.SteadyState, 15, 1.50m, 1.50m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.95m, 0.95m),
                (StepType.SteadyState, 15, 1.50m, 1.50m),
                (StepType.SteadyState, 300, 0.55m, 0.55m),
                (StepType.SteadyState, 600, 0.95m, 0.95m),
                (StepType.SteadyState, 15, 1.50m, 1.50m),
                (StepType.Cooldown, 900, 0.60m, 0.40m)),
        ];
    }

    private static Workout BuildWorkout(
        string name, string description, WorkoutCategory category,
        TrainingZone zone, int approxMinutes, string tags, DateTime now,
        params (StepType type, int durationSec, decimal powerLow, decimal powerHigh)[] steps)
    {
        var workout = Workout.Create(null, name, description, category, WorkoutSource.System, zone, true, tags, now);
        var order = 0;
        foreach (var (type, durationSec, powerLow, powerHigh) in steps)
        {
            var step = WorkoutStep.Create(workout.Id, ++order, type, durationSec, powerLow, powerHigh);
            workout.AddStep(step);
        }
        return workout;
    }
}
