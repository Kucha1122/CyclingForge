using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.ValueObjects;

namespace CyclingForge.Modules.Activities.Domain.Repositories;

public interface IActivityRepository
{
    Task<Activity?> GetByIdAsync(ActivityId id, CancellationToken cancellationToken = default);
    Task<Activity?> GetByStravaIdAsync(long stravaActivityId, Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Activity>> GetByUserIdAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken = default);
    Task AddAsync(Activity activity, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<Activity> activities, CancellationToken cancellationToken = default);
    Task UpdateAsync(Activity activity, CancellationToken cancellationToken = default);
}
