using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Modules.Workouts.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Workouts.Infrastructure.Repositories;

internal sealed class TrainingPreferenceRepository : ITrainingPreferenceRepository
{
    private readonly WorkoutsDbContext _dbContext;

    public TrainingPreferenceRepository(WorkoutsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<TrainingPreference?> GetActiveByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.TrainingPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive, cancellationToken);

    public async Task AddAsync(TrainingPreference preference, CancellationToken cancellationToken = default)
    {
        await _dbContext.TrainingPreferences.AddAsync(preference, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(TrainingPreference preference, CancellationToken cancellationToken = default)
    {
        _dbContext.TrainingPreferences.Update(preference);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
