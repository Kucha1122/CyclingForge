using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Workouts.Domain.Entities;

public sealed class TrainingPreference : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public TrainingGoal Goal { get; private set; }
    public int DaysPerWeek { get; private set; }
    public decimal WeeklyHoursAvailable { get; private set; }
    public int PlanDurationWeeks { get; private set; }
    public FitnessLevel Level { get; private set; }
    public DateTime? TargetEventDate { get; private set; }
    public int PreferredWorkoutMinutes { get; private set; }
    public bool ConsiderNonCycling { get; private set; }
    public PlanMode PlanMode { get; private set; }
    public PeriodizationModel PeriodizationModel { get; private set; }
    /// <summary>Day of week reserved for one longer endurance ride (0 = Monday .. 6 = Sunday); null = none.</summary>
    public int? LongRideDay { get; private set; }
    /// <summary>Maximum length the user can ride in a single session (minutes), used to cap the long ride.</summary>
    public int MaxLongRideMinutes { get; private set; }
    /// <summary>Total weeks in a meso-cycle: progressive build weeks followed by one deload week.</summary>
    public int MesocycleWeeks { get; private set; }
    /// <summary>CSV of weekday indices the user wants off (0 = Monday .. 6 = Sunday); null = auto.</summary>
    public string? RestDays { get; private set; }
    /// <summary>First day of the week for plan generation and weekly views (0 = Monday .. 6 = Sunday).</summary>
    public int WeekStartDay { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private TrainingPreference() { }

    public static TrainingPreference Create(
        Guid userId,
        TrainingGoal goal,
        int daysPerWeek,
        decimal weeklyHoursAvailable,
        int planDurationWeeks,
        FitnessLevel level,
        DateTime? targetEventDate,
        int preferredWorkoutMinutes,
        bool considerNonCycling,
        PlanMode planMode,
        PeriodizationModel periodizationModel,
        int? longRideDay,
        int maxLongRideMinutes,
        int mesocycleWeeks,
        IReadOnlyList<int>? restDays,
        int weekStartDay,
        DateTime createdAt)
    {
        return new TrainingPreference
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Goal = goal,
            DaysPerWeek = Math.Clamp(daysPerWeek, 2, 7),
            WeeklyHoursAvailable = weeklyHoursAvailable,
            PlanDurationWeeks = planDurationWeeks,
            Level = level,
            TargetEventDate = targetEventDate,
            PreferredWorkoutMinutes = preferredWorkoutMinutes,
            ConsiderNonCycling = considerNonCycling,
            PlanMode = planMode,
            PeriodizationModel = periodizationModel,
            LongRideDay = NormalizeLongRideDay(longRideDay),
            MaxLongRideMinutes = Math.Clamp(maxLongRideMinutes, 60, 360),
            MesocycleWeeks = Math.Clamp(mesocycleWeeks, 2, 8),
            RestDays = NormalizeRestDays(restDays),
            WeekStartDay = NormalizeWeekStartDay(weekStartDay),
            IsActive = true,
            CreatedAt = createdAt
        };
    }

    public void Update(
        TrainingGoal goal,
        int daysPerWeek,
        decimal weeklyHoursAvailable,
        int planDurationWeeks,
        FitnessLevel level,
        DateTime? targetEventDate,
        int preferredWorkoutMinutes,
        bool considerNonCycling,
        PlanMode planMode,
        PeriodizationModel periodizationModel,
        int? longRideDay,
        int maxLongRideMinutes,
        int mesocycleWeeks,
        IReadOnlyList<int>? restDays,
        int weekStartDay,
        DateTime updatedAt)
    {
        Goal = goal;
        DaysPerWeek = Math.Clamp(daysPerWeek, 2, 7);
        WeeklyHoursAvailable = weeklyHoursAvailable;
        PlanDurationWeeks = planDurationWeeks;
        Level = level;
        TargetEventDate = targetEventDate;
        PreferredWorkoutMinutes = preferredWorkoutMinutes;
        ConsiderNonCycling = considerNonCycling;
        PlanMode = planMode;
        PeriodizationModel = periodizationModel;
        LongRideDay = NormalizeLongRideDay(longRideDay);
        MaxLongRideMinutes = Math.Clamp(maxLongRideMinutes, 60, 360);
        MesocycleWeeks = Math.Clamp(mesocycleWeeks, 2, 8);
        RestDays = NormalizeRestDays(restDays);
        WeekStartDay = NormalizeWeekStartDay(weekStartDay);
        UpdatedAt = updatedAt;
    }

    private static int NormalizeWeekStartDay(int day)
        => day is >= 0 and <= 6 ? day : 0;

    private static int? NormalizeLongRideDay(int? day)
        => day is >= 0 and <= 6 ? day : null;

    private static string? NormalizeRestDays(IReadOnlyList<int>? days)
    {
        if (days is null)
            return null;
        var valid = days.Where(d => d is >= 0 and <= 6).Distinct().OrderBy(d => d).ToList();
        return valid.Count == 0 ? null : string.Join(",", valid);
    }

    public IReadOnlyList<int> GetRestDays()
        => string.IsNullOrEmpty(RestDays)
            ? Array.Empty<int>()
            : RestDays.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList();

    public void Deactivate(DateTime updatedAt)
    {
        IsActive = false;
        UpdatedAt = updatedAt;
    }

    public void Activate(DateTime updatedAt)
    {
        IsActive = true;
        UpdatedAt = updatedAt;
    }
}
