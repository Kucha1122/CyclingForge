using CyclingForge.Modules.Workouts.Domain.Entities;

namespace CyclingForge.Modules.Workouts.Domain.Repositories;

public interface ITrainingPreferenceRepository
{
    Task<TrainingPreference?> GetActiveByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(TrainingPreference preference, CancellationToken cancellationToken = default);
    Task UpdateAsync(TrainingPreference preference, CancellationToken cancellationToken = default);
}
