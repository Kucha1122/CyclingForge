using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Garmin.Infrastructure.Repositories;

internal sealed class GarminWellnessRepository : IGarminWellnessRepository
{
    private readonly GarminDbContext _dbContext;

    public GarminWellnessRepository(GarminDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GarminDailyWellness?> GetByUserIdAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default)
        => await _dbContext.GarminDailyWellness.FirstOrDefaultAsync(
            w => w.UserId == userId && w.Date == date, cancellationToken);

    public async Task<GarminDailyWellness?> GetLatestByUserIdAsync(Guid userId, DateOnly onOrBefore, CancellationToken cancellationToken = default)
    {
        // Garmin may have a wellness row for today before Training Readiness is computed; prefer the
        // most recent day that actually carries a readiness score, then fall back to any latest row.
        var withReadiness = await _dbContext.GarminDailyWellness
            .Where(w => w.UserId == userId && w.Date <= onOrBefore && w.TrainingReadinessScore != null)
            .OrderByDescending(w => w.Date)
            .FirstOrDefaultAsync(cancellationToken);
        if (withReadiness is not null)
            return withReadiness;

        return await _dbContext.GarminDailyWellness
            .Where(w => w.UserId == userId && w.Date <= onOrBefore)
            .OrderByDescending(w => w.Date)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<GarminDailyWellness>> GetByUserIdAndDateRangeAsync(
        Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
        => await _dbContext.GarminDailyWellness
            .Where(w => w.UserId == userId && w.Date >= startDate && w.Date <= endDate)
            .OrderByDescending(w => w.Date)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(GarminDailyWellness wellness, CancellationToken cancellationToken = default)
    {
        await _dbContext.GarminDailyWellness.AddAsync(wellness, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(GarminDailyWellness wellness, CancellationToken cancellationToken = default)
    {
        _dbContext.GarminDailyWellness.Update(wellness);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
