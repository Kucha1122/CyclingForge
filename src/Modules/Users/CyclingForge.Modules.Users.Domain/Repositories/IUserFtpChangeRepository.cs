using CyclingForge.Modules.Users.Domain.Entities;

namespace CyclingForge.Modules.Users.Domain.Repositories;

public interface IUserFtpChangeRepository
{
    Task AddAsync(UserFtpChange change, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserFtpChange>> GetByUserIdInRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    /// <summary>
    /// All changes for the user on or before the given date, ordered by EffectiveDate descending (most recent first).
    /// </summary>
    Task<IReadOnlyList<UserFtpChange>> GetByUserIdOnOrBeforeAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default);
}
