using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.SaveTrainingPreference;

public sealed record SaveTrainingPreferenceCommand(
    Guid UserId,
    string Goal,
    int DaysPerWeek,
    decimal WeeklyHoursAvailable,
    int PlanDurationWeeks,
    string Level,
    DateTime? TargetEventDate,
    int PreferredWorkoutMinutes,
    bool ConsiderNonCycling) : ICommand<TrainingPreferenceDto>;
