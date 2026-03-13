using CyclingForge.Modules.Garmin.Domain.Entities;

namespace CyclingForge.Modules.Garmin.Domain.Repositories;

public interface IGarminTokenRepository
{
    Task<GarminToken?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(GarminToken token, CancellationToken cancellationToken = default);
    Task UpdateAsync(GarminToken token, CancellationToken cancellationToken = default);
    Task DeleteAsync(GarminToken token, CancellationToken cancellationToken = default);
}
