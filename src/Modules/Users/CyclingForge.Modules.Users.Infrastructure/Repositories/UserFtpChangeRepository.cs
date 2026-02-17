using CyclingForge.Modules.Users.Domain.Entities;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Users.Infrastructure.Repositories;

internal sealed class UserFtpChangeRepository : IUserFtpChangeRepository
{
    private readonly UsersDbContext _dbContext;

    public UserFtpChangeRepository(UsersDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(UserFtpChange change, CancellationToken cancellationToken = default)
    {
        await _dbContext.UserFtpChanges.AddAsync(change, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserFtpChange>> GetByUserIdInRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        return await _dbContext.UserFtpChanges
            .Where(x => x.UserId == userId && x.EffectiveDate >= startDate && x.EffectiveDate <= endDate)
            .OrderBy(x => x.EffectiveDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserFtpChange>> GetByUserIdOnOrBeforeAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
    {
        return await _dbContext.UserFtpChanges
            .Where(x => x.UserId == userId && x.EffectiveDate <= date)
            .OrderByDescending(x => x.EffectiveDate)
            .ToListAsync(cancellationToken);
    }
}
