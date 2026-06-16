using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Garmin.Infrastructure.Repositories;

internal sealed class GarminHrvRepository : IGarminHrvRepository
{
    private readonly GarminDbContext _dbContext;

    public GarminHrvRepository(GarminDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GarminHrvData?> GetByUserIdAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default)
        => await _dbContext.GarminHrvData.FirstOrDefaultAsync(
            h => h.UserId == userId && h.Date == date, cancellationToken);

    public async Task<IReadOnlyList<GarminHrvData>> GetByUserIdAndDateRangeAsync(
        Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
        => await _dbContext.GarminHrvData
            .Where(h => h.UserId == userId && h.Date >= startDate && h.Date <= endDate)
            .OrderByDescending(h => h.Date)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(GarminHrvData hrv, CancellationToken cancellationToken = default)
    {
        await _dbContext.GarminHrvData.AddAsync(hrv, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(GarminHrvData hrv, CancellationToken cancellationToken = default)
    {
        _dbContext.GarminHrvData.Update(hrv);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
