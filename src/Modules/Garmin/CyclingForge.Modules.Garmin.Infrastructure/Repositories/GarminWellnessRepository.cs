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
