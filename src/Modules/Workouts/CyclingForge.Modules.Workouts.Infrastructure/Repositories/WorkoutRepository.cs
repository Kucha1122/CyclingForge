using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Modules.Workouts.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Workouts.Infrastructure.Repositories;

internal sealed class WorkoutRepository : IWorkoutRepository
{
    private readonly WorkoutsDbContext _dbContext;

    public WorkoutRepository(WorkoutsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Workout?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => await _dbContext.Workouts.FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

    public async Task<Workout?> GetByIdWithStepsAsync(Guid id, CancellationToken cancellationToken = default)
        => await _dbContext.Workouts
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Workout>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.Workouts
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Workout>> GetSystemWorkoutsAsync(CancellationToken cancellationToken = default)
        => await _dbContext.Workouts
            .Where(w => w.UserId == null && w.Source == WorkoutSource.System)
            .OrderBy(w => w.Category)
            .ThenBy(w => w.DurationMinutes)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Workout>> SearchAsync(
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
        CancellationToken cancellationToken = default)
    {
        var query = BuildSearchQuery(userId, category, zone, source, minDuration, maxDuration, searchTerm);

        query = sortBy switch
        {
            "name_asc"      => query.OrderBy(w => w.Name),
            "name_desc"     => query.OrderByDescending(w => w.Name),
            "duration_asc"  => query.OrderBy(w => w.DurationMinutes),
            "duration_desc" => query.OrderByDescending(w => w.DurationMinutes),
            "tss_asc"       => query.OrderBy(w => w.EstimatedTSS),
            "tss_desc"      => query.OrderByDescending(w => w.EstimatedTSS),
            _               => query.OrderBy(w => w.Category).ThenBy(w => w.DurationMinutes),
        };

        return await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> CountAsync(
        Guid? userId,
        WorkoutCategory? category,
        TrainingZone? zone,
        WorkoutSource? source,
        int? minDuration,
        int? maxDuration,
        string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        var query = BuildSearchQuery(userId, category, zone, source, minDuration, maxDuration, searchTerm);
        return await query.CountAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Workout>> GetByCategoryAndDurationAsync(
        WorkoutCategory category,
        int minDuration,
        int maxDuration,
        CancellationToken cancellationToken = default)
        => await _dbContext.Workouts
            .Include(w => w.Steps)
            .Where(w => w.Category == category
                        && w.IsPublic
                        && w.DurationMinutes >= minDuration
                        && w.DurationMinutes <= maxDuration)
            .ToListAsync(cancellationToken);

    public async Task<Workout?> GetGeneratedAsync(
        Guid userId,
        WorkoutCategory category,
        int minDuration,
        int maxDuration,
        CancellationToken cancellationToken = default)
        => await _dbContext.Workouts
            .Include(w => w.Steps)
            .Where(w => w.UserId == userId
                        && w.Source == WorkoutSource.Generated
                        && w.Category == category
                        && w.DurationMinutes >= minDuration
                        && w.DurationMinutes <= maxDuration)
            .OrderBy(w => w.DurationMinutes)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task AddAsync(Workout workout, CancellationToken cancellationToken = default)
    {
        await _dbContext.Workouts.AddAsync(workout, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Workout workout, CancellationToken cancellationToken = default)
    {
        // Replace all existing steps with the current in-memory set of steps on the aggregate.
        // We explicitly delete old WorkoutSteps and insert the new ones, to avoid EF trying to
        // UPDATE non-existing rows (which caused DbUpdateConcurrencyException earlier).
        var existingSteps = await _dbContext.WorkoutSteps
            .Where(s => s.WorkoutId == workout.Id)
            .ToListAsync(cancellationToken);

        if (existingSteps.Count > 0)
        {
            _dbContext.WorkoutSteps.RemoveRange(existingSteps);
        }

        foreach (var step in workout.Steps)
        {
            // Ensure every current step is treated as a new row for this workout
            _dbContext.Entry(step).State = EntityState.Added;
        }

        // Make sure the workout itself is tracked and marked as modified for scalar changes
        if (_dbContext.Entry(workout).State == EntityState.Detached)
        {
            _dbContext.Workouts.Attach(workout);
        }
        _dbContext.Entry(workout).State = EntityState.Modified;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Workout workout, CancellationToken cancellationToken = default)
    {
        await RemoveRecommendationReferencesAsync(new[] { workout.Id }, cancellationToken);
        _dbContext.Workouts.Remove(workout);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAllByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var toDelete = await _dbContext.Workouts
            .Where(w => w.UserId == userId)
            .ToListAsync(cancellationToken);

        await RemoveRecommendationReferencesAsync(toDelete.Select(w => w.Id).ToList(), cancellationToken);
        _dbContext.Workouts.RemoveRange(toDelete);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    // Daily recommendations reference workouts with a NoAction FK, so any recommendation pointing
    // at a workout being deleted must be removed first (it will be regenerated on next view).
    private async Task RemoveRecommendationReferencesAsync(
        IReadOnlyCollection<Guid> workoutIds, CancellationToken cancellationToken)
    {
        if (workoutIds.Count == 0)
            return;

        var referencing = await _dbContext.DailyRecommendations
            .Where(r => (r.RecommendedWorkoutId.HasValue && workoutIds.Contains(r.RecommendedWorkoutId.Value))
                        || (r.AlternativeWorkoutId.HasValue && workoutIds.Contains(r.AlternativeWorkoutId.Value)))
            .ToListAsync(cancellationToken);

        if (referencing.Count > 0)
            _dbContext.DailyRecommendations.RemoveRange(referencing);
    }

    private IQueryable<Workout> BuildSearchQuery(
        Guid? userId,
        WorkoutCategory? category,
        TrainingZone? zone,
        WorkoutSource? source,
        int? minDuration,
        int? maxDuration,
        string? searchTerm)
    {
        var query = _dbContext.Workouts.AsQueryable();

        query = query.Where(w =>
            (w.UserId == null && w.Source == WorkoutSource.System) ||
            (w.IsPublic) ||
            (userId.HasValue && w.UserId == userId));

        if (category.HasValue)
            query = query.Where(w => w.Category == category.Value);

        if (zone.HasValue)
            query = query.Where(w => w.TargetZone == zone.Value);

        if (source.HasValue)
        {
            if (source.Value == WorkoutSource.UserCreated && userId.HasValue)
                query = query.Where(w => w.UserId == userId.Value &&
                    (w.Source == WorkoutSource.UserCreated || w.Source == WorkoutSource.Imported));
            else
                query = query.Where(w => w.Source == source.Value);
        }

        if (minDuration.HasValue)
            query = query.Where(w => w.DurationMinutes >= minDuration.Value);

        if (maxDuration.HasValue)
            query = query.Where(w => w.DurationMinutes <= maxDuration.Value);

        if (!string.IsNullOrWhiteSpace(searchTerm))
            query = query.Where(w =>
                w.Name.Contains(searchTerm) ||
                (w.Tags != null && w.Tags.Contains(searchTerm)));

        return query;
    }
}
