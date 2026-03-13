using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Workouts.Domain.Entities;

public sealed class DailyRecommendation : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public DateOnly Date { get; private set; }
    public Guid? RecommendedWorkoutId { get; private set; }
    public Guid? AlternativeWorkoutId { get; private set; }
    public decimal ReadinessScore { get; private set; }
    public RecommendationType Type { get; private set; }
    public string Reason { get; private set; } = string.Empty;
    public RecommendationStatus Status { get; private set; }
    public Guid? CompletedActivityId { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public Workout? RecommendedWorkout { get; private set; }
    public Workout? AlternativeWorkout { get; private set; }

    private DailyRecommendation() { }

    public static DailyRecommendation Create(
        Guid userId,
        DateOnly date,
        Guid? recommendedWorkoutId,
        Guid? alternativeWorkoutId,
        decimal readinessScore,
        RecommendationType type,
        string reason,
        DateTime createdAt)
    {
        return new DailyRecommendation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Date = date,
            RecommendedWorkoutId = recommendedWorkoutId,
            AlternativeWorkoutId = alternativeWorkoutId,
            ReadinessScore = readinessScore,
            Type = type,
            Reason = reason,
            Status = RecommendationStatus.Pending,
            CreatedAt = createdAt
        };
    }

    public void Accept() => Status = RecommendationStatus.Accepted;

    public void Complete(Guid? activityId)
    {
        Status = RecommendationStatus.Completed;
        CompletedActivityId = activityId;
    }

    public void Skip() => Status = RecommendationStatus.Skipped;
}
