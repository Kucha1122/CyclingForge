namespace CyclingForge.Modules.Workouts.Api.Requests;

public sealed record SaveTrainingPreferenceRequest(
    string Goal,
    int DaysPerWeek,
    decimal WeeklyHoursAvailable,
    int PlanDurationWeeks,
    string Level,
    DateTime? TargetEventDate,
    int PreferredWorkoutMinutes,
    bool ConsiderNonCycling);
