using CyclingForge.Modules.Garmin.Domain.Entities;

namespace CyclingForge.Modules.Garmin.Domain.Repositories;

public interface IGarminHrvRepository
{
    Task<GarminHrvData?> GetByUserIdAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GarminHrvData>> GetByUserIdAndDateRangeAsync(Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
    Task AddAsync(GarminHrvData hrv, CancellationToken cancellationToken = default);
    Task UpdateAsync(GarminHrvData hrv, CancellationToken cancellationToken = default);
}
