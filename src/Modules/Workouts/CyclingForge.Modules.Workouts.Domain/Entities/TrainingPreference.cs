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
        UpdatedAt = updatedAt;
    }

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
