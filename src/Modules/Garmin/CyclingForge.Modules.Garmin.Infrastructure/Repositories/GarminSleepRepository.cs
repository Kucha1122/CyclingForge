using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Garmin.Infrastructure.Repositories;

internal sealed class GarminSleepRepository : IGarminSleepRepository
{
    private readonly GarminDbContext _dbContext;

    public GarminSleepRepository(GarminDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GarminSleepData?> GetByUserIdAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default)
        => await _dbContext.GarminSleepData.FirstOrDefaultAsync(
            s => s.UserId == userId && s.Date == date, cancellationToken);

    public async Task<IReadOnlyList<GarminSleepData>> GetByUserIdAndDateRangeAsync(
        Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
        => await _dbContext.GarminSleepData
            .Where(s => s.UserId == userId && s.Date >= startDate && s.Date <= endDate)
            .OrderByDescending(s => s.Date)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(GarminSleepData sleep, CancellationToken cancellationToken = default)
    {
        await _dbContext.GarminSleepData.AddAsync(sleep, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(GarminSleepData sleep, CancellationToken cancellationToken = default)
    {
        _dbContext.GarminSleepData.Update(sleep);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
