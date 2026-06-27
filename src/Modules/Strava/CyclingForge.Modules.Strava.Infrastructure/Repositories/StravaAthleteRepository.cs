using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Strava.Infrastructure.Repositories;

internal sealed class StravaAthleteRepository : IStravaAthleteRepository
{
    private readonly StravaDbContext _dbContext;

    public StravaAthleteRepository(StravaDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<StravaAthlete?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.StravaAthletes.FirstOrDefaultAsync(a => a.UserId == userId, cancellationToken);

    public async Task<StravaAthlete?> GetByStravaIdAsync(long stravaId, CancellationToken cancellationToken = default)
    {
        var athleteId = new Domain.ValueObjects.StravaAthleteId(stravaId);
        return await _dbContext.StravaAthletes.FirstOrDefaultAsync(
            a => a.StravaId == athleteId, cancellationToken);
    }

    public async Task AddAsync(StravaAthlete athlete, CancellationToken cancellationToken = default)
    {
        await _dbContext.StravaAthletes.AddAsync(athlete, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(StravaAthlete athlete, CancellationToken cancellationToken = default)
    {
        _dbContext.StravaAthletes.Update(athlete);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
