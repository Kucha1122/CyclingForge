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

    // Post-workout subjective feedback (RPE loop). Null until the athlete submits it.
    public int? Rpe { get; private set; }
    public LegsFeel? LegsFeel { get; private set; }
    public SessionQuality? SessionQuality { get; private set; }
    public string? FeedbackNote { get; private set; }
    public DateTime? FeedbackAt { get; private set; }

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

    /// <summary>Turns this day into a rest day, clearing the planned workouts.</summary>
    public void MarkAsRest()
    {
        Type = RecommendationType.RestDay;
        RecommendedWorkoutId = null;
        AlternativeWorkoutId = null;
        RecommendedWorkout = null;
        AlternativeWorkout = null;
    }

    /// <summary>Promotes the alternative workout to the primary slot. Returns false when none exists.</summary>
    public bool SwapToAlternative()
    {
        if (!AlternativeWorkoutId.HasValue)
            return false;

        (RecommendedWorkoutId, AlternativeWorkoutId) = (AlternativeWorkoutId, RecommendedWorkoutId);
        (RecommendedWorkout, AlternativeWorkout) = (AlternativeWorkout, RecommendedWorkout);
        if (Type == RecommendationType.RestDay)
            Type = RecommendationType.Workout;
        return true;
    }

    /// <summary>Exchanges the planned content (workouts + type) with another day, keeping both dates fixed.
    /// Used to move/reorder a session without violating the unique (user, date) constraint.</summary>
    public void SwapContentWith(DailyRecommendation other)
    {
        (RecommendedWorkoutId, other.RecommendedWorkoutId) = (other.RecommendedWorkoutId, RecommendedWorkoutId);
        (AlternativeWorkoutId, other.AlternativeWorkoutId) = (other.AlternativeWorkoutId, AlternativeWorkoutId);
        (Type, other.Type) = (other.Type, Type);
        (RecommendedWorkout, other.RecommendedWorkout) = (other.RecommendedWorkout, RecommendedWorkout);
        (AlternativeWorkout, other.AlternativeWorkout) = (other.AlternativeWorkout, AlternativeWorkout);
    }

    /// <summary>Records post-workout subjective feedback. RPE uses the CR10 scale (1–10).</summary>
    public void SubmitFeedback(int rpe, LegsFeel? legsFeel, SessionQuality? quality, string? note, DateTime at)
    {
        if (rpe is < 1 or > 10)
            throw new ArgumentException("RPE must be between 1 and 10.", nameof(rpe));

        Rpe = rpe;
        LegsFeel = legsFeel;
        SessionQuality = quality;
        FeedbackNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        FeedbackAt = at;
    }
}
