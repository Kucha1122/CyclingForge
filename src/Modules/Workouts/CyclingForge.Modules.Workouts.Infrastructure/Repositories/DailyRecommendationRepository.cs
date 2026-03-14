using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Modules.Workouts.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Workouts.Infrastructure.Repositories;

internal sealed class DailyRecommendationRepository : IDailyRecommendationRepository
{
    private readonly WorkoutsDbContext _dbContext;

    public DailyRecommendationRepository(WorkoutsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DailyRecommendation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => await _dbContext.DailyRecommendations
            .Include(r => r.RecommendedWorkout)
            .Include(r => r.AlternativeWorkout)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public async Task<DailyRecommendation?> GetByUserIdAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default)
        => await _dbContext.DailyRecommendations
            .Include(r => r.RecommendedWorkout)
                .ThenInclude(w => w!.Steps)
            .Include(r => r.AlternativeWorkout)
                .ThenInclude(w => w!.Steps)
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Date == date, cancellationToken);

    public async Task<IReadOnlyList<DailyRecommendation>> GetByUserIdAndDateRangeAsync(
        Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
        => await _dbContext.DailyRecommendations
            .Include(r => r.RecommendedWorkout)
            .Include(r => r.AlternativeWorkout)
            .Where(r => r.UserId == userId && r.Date >= startDate && r.Date <= endDate)
            .OrderBy(r => r.Date)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Guid>> GetRecentWorkoutIdsAsync(Guid userId, int daysBack, CancellationToken cancellationToken = default)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-daysBack));
        return await _dbContext.DailyRecommendations
            .Where(r => r.UserId == userId
                        && r.Date >= cutoff
                        && r.Status == RecommendationStatus.Completed
                        && r.RecommendedWorkoutId.HasValue)
            .Select(r => r.RecommendedWorkoutId!.Value)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(DailyRecommendation recommendation, CancellationToken cancellationToken = default)
    {
        await _dbContext.DailyRecommendations.AddAsync(recommendation, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(DailyRecommendation recommendation, CancellationToken cancellationToken = default)
    {
        _dbContext.DailyRecommendations.Update(recommendation);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteByUserIdFromDateAsync(Guid userId, DateOnly fromDate, CancellationToken cancellationToken = default)
    {
        var toDelete = await _dbContext.DailyRecommendations
            .Where(r => r.UserId == userId && r.Date >= fromDate)
            .ToListAsync(cancellationToken);
        _dbContext.DailyRecommendations.RemoveRange(toDelete);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
