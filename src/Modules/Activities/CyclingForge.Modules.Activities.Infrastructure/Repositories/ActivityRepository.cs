using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Activities.Domain.ValueObjects;
using CyclingForge.Modules.Activities.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Activities.Infrastructure.Repositories;

internal sealed class ActivityRepository : IActivityRepository
{
    private readonly ActivitiesDbContext _dbContext;

    public ActivityRepository(ActivitiesDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Activity?> GetByIdAsync(ActivityId id, CancellationToken cancellationToken = default)
        => await _dbContext.Activities.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    public async Task<Activity?> GetByStravaIdAsync(long stravaActivityId, Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.Activities
            .FirstOrDefaultAsync(a => a.StravaActivityId == stravaActivityId && a.UserId == userId, cancellationToken);

    public async Task<DateTime?> GetLatestActivityStartDateAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.Activities
            .Where(a => a.UserId == userId)
            .MaxAsync(a => (DateTime?)a.StartDate, cancellationToken);

    public async Task<IReadOnlyList<Activity>> GetByUserIdAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken = default)
        => await _dbContext.Activities
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.StartDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Activity>> GetByUserIdAndDateRangeAsync(
        Guid userId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
        => await _dbContext.Activities
            .Where(a => a.UserId == userId && a.StartDate >= startDate && a.StartDate <= endDate)
            .OrderBy(a => a.StartDate)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Activity activity, CancellationToken cancellationToken = default)
    {
        await _dbContext.Activities.AddAsync(activity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddRangeAsync(IEnumerable<Activity> activities, CancellationToken cancellationToken = default)
    {
        await _dbContext.Activities.AddRangeAsync(activities, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Activity activity, CancellationToken cancellationToken = default)
    {
        _dbContext.Activities.Update(activity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
