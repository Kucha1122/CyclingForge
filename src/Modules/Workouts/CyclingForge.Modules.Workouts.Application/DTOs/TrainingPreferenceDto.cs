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
    bool IsActive);
