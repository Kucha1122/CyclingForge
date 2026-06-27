using CyclingForge.Modules.Strava.Domain.Entities;

namespace CyclingForge.Modules.Strava.Domain.Repositories;

public interface IStravaAthleteRepository
{
    Task<StravaAthlete?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<StravaAthlete?> GetByStravaIdAsync(long stravaId, CancellationToken cancellationToken = default);
    Task AddAsync(StravaAthlete athlete, CancellationToken cancellationToken = default);
    Task UpdateAsync(StravaAthlete athlete, CancellationToken cancellationToken = default);
}
