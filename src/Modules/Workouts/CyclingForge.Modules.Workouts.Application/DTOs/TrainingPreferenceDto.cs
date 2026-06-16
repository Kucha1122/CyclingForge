namespace CyclingForge.Modules.Workouts.Application.DTOs;

public sealed record TrainingPreferenceDto(
    Guid Id,
    string Goal,
    int DaysPerWeek,
    decimal WeeklyHoursAvailable,
    int PlanDurationWeeks,
    string Level,
    DateTime? TargetEventDate,
    int PreferredWorkoutMinutes,
    bool ConsiderNonCycling,
    string PlanMode,
    string PeriodizationModel,
    int? LongRideDay,
    int MaxLongRideMinutes,
    int MesocycleWeeks,
    IReadOnlyList<int> RestDays,
    int WeekStartDay,
    bool IsActive);
