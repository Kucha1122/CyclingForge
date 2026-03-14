using CyclingForge.Modules.Workouts.Application.DTOs;

namespace CyclingForge.Modules.Workouts.Application.Services;

public interface IRecommendationEngine
{
    Task<DailyRecommendationDto> GenerateRecommendationAsync(
        Guid userId,
        DateOnly date,
        CancellationToken cancellationToken = default,
        IReadOnlyList<Guid>? avoidRepeatWorkoutIds = null);
    Task<ReadinessBreakdownDto> GetReadinessBreakdownAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
}
