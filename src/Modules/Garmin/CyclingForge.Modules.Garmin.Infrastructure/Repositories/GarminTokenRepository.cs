using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Garmin.Infrastructure.Repositories;

internal sealed class GarminTokenRepository : IGarminTokenRepository
{
    private readonly GarminDbContext _dbContext;

    public GarminTokenRepository(GarminDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GarminToken?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.GarminTokens.FirstOrDefaultAsync(t => t.UserId == userId, cancellationToken);

    public async Task AddAsync(GarminToken token, CancellationToken cancellationToken = default)
    {
        await _dbContext.GarminTokens.AddAsync(token, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(GarminToken token, CancellationToken cancellationToken = default)
    {
        _dbContext.GarminTokens.Update(token);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(GarminToken token, CancellationToken cancellationToken = default)
    {
        _dbContext.GarminTokens.Remove(token);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
