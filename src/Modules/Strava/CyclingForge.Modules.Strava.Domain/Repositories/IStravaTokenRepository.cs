using CyclingForge.Modules.Strava.Domain.Entities;

namespace CyclingForge.Modules.Strava.Domain.Repositories;

public interface IStravaTokenRepository
{
    Task<StravaToken?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(StravaToken token, CancellationToken cancellationToken = default);
    Task UpdateAsync(StravaToken token, CancellationToken cancellationToken = default);
}
