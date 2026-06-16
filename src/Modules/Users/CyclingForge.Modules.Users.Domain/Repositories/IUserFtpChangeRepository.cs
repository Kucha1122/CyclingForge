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

    /// <summary>
    /// Deletes all automatically estimated FTP changes (Source = "EstimatedFromActivity") for the user.
    /// Manual changes are preserved. Used to rebuild the eFTP timeline during a forced recompute.
    /// Returns the number of rows removed.
    /// </summary>
    Task<int> DeleteEstimatedFromActivityAsync(Guid userId, CancellationToken cancellationToken = default);
}
