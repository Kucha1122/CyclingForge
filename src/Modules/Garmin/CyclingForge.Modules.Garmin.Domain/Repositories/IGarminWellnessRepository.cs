using CyclingForge.Modules.Garmin.Domain.Entities;

namespace CyclingForge.Modules.Garmin.Domain.Repositories;

public interface IGarminWellnessRepository
{
    Task<GarminDailyWellness?> GetByUserIdAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GarminDailyWellness>> GetByUserIdAndDateRangeAsync(Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
    Task AddAsync(GarminDailyWellness wellness, CancellationToken cancellationToken = default);
    Task UpdateAsync(GarminDailyWellness wellness, CancellationToken cancellationToken = default);
}
