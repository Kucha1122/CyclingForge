using CyclingForge.Modules.Workouts.Application.DTOs;

namespace CyclingForge.Modules.Workouts.Application.Services;

public interface IRecommendationEngine
{
    Task<DailyRecommendationDto> GenerateRecommendationAsync(
        Guid userId,
        DateOnly date,
        CancellationToken cancellationToken = default,
        IReadOnlyList<Guid>? avoidRepeatWorkoutIds = null,
        DayIntent? plannedIntent = null);
    Task<ReadinessBreakdownDto> GetReadinessBreakdownAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the recommendation with its readiness score and reason recomputed from the current
    /// readiness data for the given date. The chosen workout is preserved; only the readiness snapshot
    /// (which can become stale after a Garmin/activity sync) is refreshed so the UI shows live values.
    /// </summary>
    Task<DailyRecommendationDto> RefreshReadinessAsync(
        DailyRecommendationDto recommendation, Guid userId, DateOnly date, CancellationToken cancellationToken = default);
}
