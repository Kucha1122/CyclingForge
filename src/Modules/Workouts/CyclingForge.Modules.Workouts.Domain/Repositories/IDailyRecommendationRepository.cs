using CyclingForge.Modules.Workouts.Domain.Entities;

namespace CyclingForge.Modules.Workouts.Domain.Repositories;

public interface IDailyRecommendationRepository
{
    Task<DailyRecommendation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<DailyRecommendation?> GetByUserIdAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DailyRecommendation>> GetByUserIdAndDateRangeAsync(
        Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetRecentWorkoutIdsAsync(Guid userId, int daysBack, CancellationToken cancellationToken = default);
    /// <summary>Returns recent RPE values (most recent first) for completed sessions that have post-workout feedback.</summary>
    Task<IReadOnlyList<int>> GetRecentRpeAsync(Guid userId, int daysBack, int take, CancellationToken cancellationToken = default);
    Task AddAsync(DailyRecommendation recommendation, CancellationToken cancellationToken = default);
    Task UpdateAsync(DailyRecommendation recommendation, CancellationToken cancellationToken = default);
    Task DeleteByUserIdFromDateAsync(Guid userId, DateOnly fromDate, CancellationToken cancellationToken = default);
}
