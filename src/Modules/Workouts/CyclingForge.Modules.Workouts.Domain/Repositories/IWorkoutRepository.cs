using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;

namespace CyclingForge.Modules.Workouts.Domain.Repositories;

public interface IWorkoutRepository
{
    Task<Workout?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Workout?> GetByIdWithStepsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Workout>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Workout>> GetSystemWorkoutsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Workout>> SearchAsync(
        Guid? userId,
        WorkoutCategory? category,
        TrainingZone? zone,
        WorkoutSource? source,
        int? minDuration,
        int? maxDuration,
        string? searchTerm,
        string? sortBy,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<int> CountAsync(
        Guid? userId,
        WorkoutCategory? category,
        TrainingZone? zone,
        WorkoutSource? source,
        int? minDuration,
        int? maxDuration,
        string? searchTerm,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Workout>> GetByCategoryAndDurationAsync(
        WorkoutCategory category,
        int minDuration,
        int maxDuration,
        CancellationToken cancellationToken = default);
    Task AddAsync(Workout workout, CancellationToken cancellationToken = default);
    Task UpdateAsync(Workout workout, CancellationToken cancellationToken = default);
    Task DeleteAsync(Workout workout, CancellationToken cancellationToken = default);
}
