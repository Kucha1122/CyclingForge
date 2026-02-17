using CyclingForge.Modules.Strava.Domain.Entities;

namespace CyclingForge.Modules.Strava.Domain.Repositories;

public interface IStravaAthleteZonesRepository
{
    Task<StravaAthleteZones?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(StravaAthleteZones zones, CancellationToken cancellationToken = default);
    Task UpdateAsync(StravaAthleteZones zones, CancellationToken cancellationToken = default);
}

