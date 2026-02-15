using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Strava.Infrastructure.Repositories;

internal sealed class StravaTokenRepository : IStravaTokenRepository
{
    private readonly StravaDbContext _dbContext;

    public StravaTokenRepository(StravaDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<StravaToken?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => await _dbContext.StravaTokens.FirstOrDefaultAsync(t => t.UserId == userId, cancellationToken);

    public async Task AddAsync(StravaToken token, CancellationToken cancellationToken = default)
    {
        await _dbContext.StravaTokens.AddAsync(token, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(StravaToken token, CancellationToken cancellationToken = default)
    {
        _dbContext.StravaTokens.Update(token);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
