using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Strava.Infrastructure.Repositories;

internal sealed class StravaActivityRepository : IStravaActivityRepository
{
    private readonly StravaDbContext _dbContext;

    public StravaActivityRepository(StravaDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<StravaActivity?> GetByExternalIdAsync(long externalId, CancellationToken cancellationToken = default)
        => await _dbContext.StravaActivities.FirstOrDefaultAsync(a => a.ExternalId == externalId, cancellationToken);

    public async Task<IReadOnlyList<StravaActivity>> GetByAthleteIdAsync(Guid athleteId, int page, int perPage, CancellationToken cancellationToken = default)
        => await _dbContext.StravaActivities
            .Where(a => a.AthleteId == athleteId)
            .OrderByDescending(a => a.StartDate)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(StravaActivity activity, CancellationToken cancellationToken = default)
    {
        await _dbContext.StravaActivities.AddAsync(activity, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(StravaActivity activity, CancellationToken cancellationToken = default)
    {
        _dbContext.StravaActivities.Update(activity);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(long externalId, CancellationToken cancellationToken = default)
        => await _dbContext.StravaActivities.AnyAsync(a => a.ExternalId == externalId, cancellationToken);
}
