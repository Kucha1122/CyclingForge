using CyclingForge.Modules.Strava.Domain.Entities;

namespace CyclingForge.Modules.Strava.Domain.Repositories;

public interface IActivitySyncFilterRepository
{
    Task<IReadOnlyList<ActivitySyncFilter>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(ActivitySyncFilter filter, CancellationToken cancellationToken = default);
    Task DeleteAsync(ActivitySyncFilter filter, CancellationToken cancellationToken = default);
    Task<ActivitySyncFilter?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
}
