using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Strava.Infrastructure.Repositories;

internal sealed class ActivitySyncFilterRepository : IActivitySyncFilterRepository
{
    private readonly StravaDbContext _dbContext;

    public ActivitySyncFilterRepository(StravaDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ActivitySyncFilter>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.ActivitySyncFilters.Where(f => f.UserId == userId).ToListAsync(cancellationToken);

    public async Task<ActivitySyncFilter?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => await _dbContext.ActivitySyncFilters.FirstOrDefaultAsync(f => f.Id == id, cancellationToken);

    public async Task AddAsync(ActivitySyncFilter filter, CancellationToken cancellationToken = default)
    {
        await _dbContext.ActivitySyncFilters.AddAsync(filter, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(ActivitySyncFilter filter, CancellationToken cancellationToken = default)
    {
        _dbContext.ActivitySyncFilters.Remove(filter);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
