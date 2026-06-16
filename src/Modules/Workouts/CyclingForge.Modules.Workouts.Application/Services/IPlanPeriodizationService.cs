using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;

namespace CyclingForge.Modules.Workouts.Application.Services;

/// <summary>
/// Decides the macro-cycle "intent" for a given day (target category, rest, deload, load),
/// independent of biometric data — used to give multi-week plans a coherent structure
/// (progressive overload, recovery/deload weeks, polarized vs pyramidal distribution).
/// </summary>
public interface IPlanPeriodizationService
{
    DayIntent GetDayIntent(TrainingPreference preference, DateOnly planStart, DateOnly date);

    /// <summary>
    /// Returns the planned intent for a date using the preference's own macro-cycle anchor,
    /// but only when the user is following a structured full plan (otherwise null, so daily
    /// recommendations stay purely readiness-driven).
    /// </summary>
    DayIntent? GetActivePlanIntent(TrainingPreference preference, DateOnly date);
}

/// <summary>
/// Planned intent for a single day within a macro-cycle.
/// </summary>
/// <param name="IsRestDay">True when this day is a scheduled rest / active-recovery day.</param>
/// <param name="TargetCategory">Planned workout category for a training day.</param>
/// <param name="LoadFactor">
/// Multiplier applied to the maintenance load (CTL) to derive the target TSS for the day.
/// Lower on deload/taper weeks, ramps up across a build block.
/// </param>
/// <param name="TargetDurationMinutes">
/// Planned session length for a training day, derived from the weekly hour budget distributed
/// across the week. Drives candidate selection and on-demand workout generation. 0 on rest days.
/// </param>
/// <param name="IsDeloadWeek">True when the week is a reduced-load recovery (super-compensation) week.</param>
/// <param name="IsTaper">True when the week is a pre-event taper.</param>
/// <param name="Model">Resolved periodization model (never Auto).</param>
public sealed record DayIntent(
    bool IsRestDay,
    WorkoutCategory TargetCategory,
    decimal LoadFactor,
    int TargetDurationMinutes,
    bool IsDeloadWeek,
    bool IsTaper,
    PeriodizationModel Model);
