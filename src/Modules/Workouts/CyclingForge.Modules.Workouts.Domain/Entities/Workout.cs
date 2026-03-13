using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Workouts.Domain.Entities;

public sealed class Workout : AggregateRoot<Guid>
{
    public Guid? UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public WorkoutCategory Category { get; private set; }
    public WorkoutSource Source { get; private set; }
    public int DurationMinutes { get; private set; }
    public int EstimatedTSS { get; private set; }
    public TrainingZone TargetZone { get; private set; }
    public bool IsPublic { get; private set; }
    public string? Tags { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private readonly List<WorkoutStep> _steps = [];
    public IReadOnlyList<WorkoutStep> Steps => _steps.AsReadOnly();

    private Workout() { }

    public static Workout Create(
        Guid? userId,
        string name,
        string description,
        WorkoutCategory category,
        WorkoutSource source,
        TrainingZone targetZone,
        bool isPublic,
        string? tags,
        DateTime createdAt)
    {
        var workout = new Workout
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Description = description,
            Category = category,
            Source = source,
            TargetZone = targetZone,
            IsPublic = isPublic,
            Tags = tags,
            CreatedAt = createdAt
        };

        return workout;
    }

    public void Update(
        string name,
        string description,
        WorkoutCategory category,
        TrainingZone targetZone,
        bool isPublic,
        string? tags,
        DateTime updatedAt)
    {
        Name = name;
        Description = description;
        Category = category;
        TargetZone = targetZone;
        IsPublic = isPublic;
        Tags = tags;
        UpdatedAt = updatedAt;
    }

    public void AddStep(WorkoutStep step)
    {
        _steps.Add(step);
        RecalculateMetrics();
    }

    public void ReplaceSteps(IEnumerable<WorkoutStep> steps)
    {
        _steps.Clear();
        _steps.AddRange(steps);
        RecalculateMetrics();
    }

    public void RecalculateMetrics()
    {
        var totalSeconds = _steps.Sum(s => s.GetTotalDurationSeconds());
        DurationMinutes = (int)Math.Ceiling(totalSeconds / 60.0);

        decimal tssAccumulator = 0;
        foreach (var step in _steps)
        {
            var dur = step.GetTotalDurationSeconds();
            var avgPower = step.GetWeightedPower();
            tssAccumulator += dur * avgPower * avgPower;
        }
        EstimatedTSS = (int)Math.Round(tssAccumulator / 3600m * 100m);
    }

    public bool IsOwnedBy(Guid userId) => UserId.HasValue && UserId.Value == userId;
    public bool IsSystemWorkout => !UserId.HasValue && Source == WorkoutSource.System;
}
