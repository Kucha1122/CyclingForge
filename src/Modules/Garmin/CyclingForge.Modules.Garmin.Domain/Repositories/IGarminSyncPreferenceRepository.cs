using CyclingForge.Modules.Garmin.Domain.Entities;

namespace CyclingForge.Modules.Garmin.Domain.Repositories;

public interface IGarminSyncPreferenceRepository
{
    Task<GarminSyncPreference?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GarminSyncPreference>> GetAllEnabledAsync(CancellationToken cancellationToken = default);
    Task AddAsync(GarminSyncPreference preference, CancellationToken cancellationToken = default);
    Task UpdateAsync(GarminSyncPreference preference, CancellationToken cancellationToken = default);
}
