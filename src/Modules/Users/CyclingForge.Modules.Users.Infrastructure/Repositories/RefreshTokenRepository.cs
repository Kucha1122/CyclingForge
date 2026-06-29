using CyclingForge.Modules.Users.Domain.Entities;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Users.Infrastructure.Repositories;

internal sealed class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly UsersDbContext _dbContext;

    public RefreshTokenRepository(UsersDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UserRefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default)
        => await _dbContext.Set<UserRefreshToken>()
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    public async Task AddAsync(UserRefreshToken token, CancellationToken cancellationToken = default)
    {
        await _dbContext.Set<UserRefreshToken>().AddAsync(token, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(UserRefreshToken token, CancellationToken cancellationToken = default)
    {
        _dbContext.Set<UserRefreshToken>().Update(token);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeAllForUserAsync(Guid userId, DateTime now, CancellationToken cancellationToken = default)
    {
        var tokens = await _dbContext.Set<UserRefreshToken>()
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
            token.Revoke(now);

        if (tokens.Count > 0)
            await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
