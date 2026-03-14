namespace CyclingForge.Modules.Workouts.Application.DTOs;

public sealed record DailyRecommendationDto(
    Guid Id,
    DateOnly Date,
    decimal ReadinessScore,
    string RecommendationType,
    string Reason,
    string Status,
    WorkoutDto? RecommendedWorkout,
    WorkoutDto? AlternativeWorkout,
    Guid? CompletedActivityId);

public sealed record ReadinessBreakdownDto(
    decimal OverallScore,
    decimal? TsbScore,
    decimal? TsbValue,
    decimal? BodyBatteryScore,
    int? BodyBatteryValue,
    decimal? SleepScore,
    int? SleepScoreValue,
    decimal? TrainingReadinessScore,
    int? TrainingReadinessValue,
    decimal? StressScore,
    int? StressValue);

public sealed record WeeklyPlanDto(
    DateOnly WeekStart,
    DateOnly WeekEnd,
    IReadOnlyList<DailyRecommendationDto> Days);

public sealed record FullPlanDto(
    DateOnly PlanStart,
    DateOnly PlanEnd,
    int Weeks,
    IReadOnlyList<WeeklyPlanDto> WeeksData);
