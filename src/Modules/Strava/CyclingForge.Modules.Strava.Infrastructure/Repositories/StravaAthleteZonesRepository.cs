using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Strava.Infrastructure.Repositories;

internal sealed class StravaAthleteZonesRepository : IStravaAthleteZonesRepository
{
    private readonly StravaDbContext _dbContext;

    public StravaAthleteZonesRepository(StravaDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<StravaAthleteZones?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.StravaAthleteZones.FirstOrDefaultAsync(z => z.UserId == userId, cancellationToken);

    public async Task AddAsync(StravaAthleteZones zones, CancellationToken cancellationToken = default)
    {
        await _dbContext.StravaAthleteZones.AddAsync(zones, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(StravaAthleteZones zones, CancellationToken cancellationToken = default)
    {
        _dbContext.StravaAthleteZones.Update(zones);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}

