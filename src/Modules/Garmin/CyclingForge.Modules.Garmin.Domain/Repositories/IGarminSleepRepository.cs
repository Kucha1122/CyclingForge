using CyclingForge.Modules.Garmin.Domain.Entities;

namespace CyclingForge.Modules.Garmin.Domain.Repositories;

public interface IGarminSleepRepository
{
    Task<GarminSleepData?> GetByUserIdAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GarminSleepData>> GetByUserIdAndDateRangeAsync(Guid userId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
    Task AddAsync(GarminSleepData sleep, CancellationToken cancellationToken = default);
    Task UpdateAsync(GarminSleepData sleep, CancellationToken cancellationToken = default);
}
