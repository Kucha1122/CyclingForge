using CyclingForge.Modules.Strava.Domain.Entities;

namespace CyclingForge.Modules.Strava.Domain.Repositories;

public interface IStravaActivityRepository
{
    Task<StravaActivity?> GetByExternalIdAsync(long externalId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StravaActivity>> GetByAthleteIdAsync(Guid athleteId, int page, int perPage, CancellationToken cancellationToken = default);
    Task AddAsync(StravaActivity activity, CancellationToken cancellationToken = default);
    Task UpdateAsync(StravaActivity activity, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(long externalId, CancellationToken cancellationToken = default);
}
