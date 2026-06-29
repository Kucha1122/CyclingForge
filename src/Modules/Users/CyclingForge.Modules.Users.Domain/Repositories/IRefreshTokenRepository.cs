using CyclingForge.Modules.Users.Domain.Entities;

namespace CyclingForge.Modules.Users.Domain.Repositories;

public interface IRefreshTokenRepository
{
    Task<UserRefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task AddAsync(UserRefreshToken token, CancellationToken cancellationToken = default);
    Task UpdateAsync(UserRefreshToken token, CancellationToken cancellationToken = default);

    /// <summary>Revokes every still-active refresh token for the user (logout / theft response).</summary>
    Task RevokeAllForUserAsync(Guid userId, DateTime now, CancellationToken cancellationToken = default);
}
