using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Garmin.Infrastructure.Repositories;

internal sealed class GarminSyncPreferenceRepository : IGarminSyncPreferenceRepository
{
    private readonly GarminDbContext _dbContext;

    public GarminSyncPreferenceRepository(GarminDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GarminSyncPreference?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.GarminSyncPreferences.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<GarminSyncPreference>> GetAllEnabledAsync(CancellationToken cancellationToken = default)
        => await _dbContext.GarminSyncPreferences.Where(p => p.Enabled).ToListAsync(cancellationToken);

    public async Task AddAsync(GarminSyncPreference preference, CancellationToken cancellationToken = default)
    {
        await _dbContext.GarminSyncPreferences.AddAsync(preference, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(GarminSyncPreference preference, CancellationToken cancellationToken = default)
    {
        _dbContext.GarminSyncPreferences.Update(preference);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
