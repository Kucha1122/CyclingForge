using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Domain.Entities;

namespace CyclingForge.Modules.Workouts.Application.Mappings;

public static class WorkoutMappings
{
    public static WorkoutDto ToDto(this Workout workout)
        => new(
            workout.Id,
            workout.UserId,
            workout.Name,
            workout.Description,
            workout.Category.ToString(),
            workout.Source.ToString(),
            workout.DurationMinutes,
            workout.EstimatedTSS,
            workout.TargetZone.ToString(),
            workout.IsPublic,
            workout.Tags,
            workout.CreatedAt,
            workout.Steps.Select(s => s.ToDto()).OrderBy(s => s.Order).ToList());

    public static WorkoutStepDto ToDto(this WorkoutStep step)
        => new(
            step.Id,
            step.Order,
            step.Type.ToString(),
            step.DurationSeconds,
            step.PowerLow,
            step.PowerHigh,
            step.Cadence,
            step.Repeat,
            step.OnDurationSeconds,
            step.OffDurationSeconds,
            step.OnPower,
            step.OffPower);

    public static WorkoutSummaryDto ToSummaryDto(this Workout workout)
        => new(
            workout.Id,
            workout.Name,
            workout.Category.ToString(),
            workout.Source.ToString(),
            workout.DurationMinutes,
            workout.EstimatedTSS,
            workout.TargetZone.ToString(),
            workout.Tags);

    public static TrainingPreferenceDto ToDto(this TrainingPreference preference)
        => new(
            preference.Id,
            preference.Goal.ToString(),
            preference.DaysPerWeek,
            preference.WeeklyHoursAvailable,
            preference.PlanDurationWeeks,
            preference.Level.ToString(),
            preference.TargetEventDate,
            preference.PreferredWorkoutMinutes,
            preference.ConsiderNonCycling,
            preference.IsActive);

    public static DailyRecommendationDto ToDto(this DailyRecommendation recommendation)
        => new(
            recommendation.Id,
            recommendation.Date,
            recommendation.ReadinessScore,
            recommendation.Type.ToString(),
            recommendation.Reason,
            recommendation.Status.ToString(),
            recommendation.RecommendedWorkout?.ToDto(),
            recommendation.AlternativeWorkout?.ToDto(),
            recommendation.CompletedActivityId);
}
