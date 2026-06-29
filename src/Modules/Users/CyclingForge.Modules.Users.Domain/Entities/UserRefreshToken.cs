using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Users.Domain.Entities;

/// <summary>
/// A refresh token issued at login and rotated on every refresh. Only the SHA-256 hash of the
/// raw token is persisted. <see cref="ExpiresAt"/> is null for "remember me" sessions (no
/// expiry, ends only on logout/revoke); short-lived otherwise.
/// </summary>
public sealed class UserRefreshToken : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime? ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? RevokedAtUtc { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }

    private UserRefreshToken() { }

    public static UserRefreshToken Create(Guid userId, string tokenHash, DateTime? expiresAt, DateTime createdAt)
        => new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            CreatedAt = createdAt,
        };

    /// <summary>True while the token has not been revoked and (if it has an expiry) has not expired.</summary>
    public bool IsActive(DateTime now)
        => RevokedAtUtc is null && (ExpiresAt is null || ExpiresAt > now);

    public void Revoke(DateTime now, Guid? replacedByTokenId = null)
    {
        RevokedAtUtc = now;
        ReplacedByTokenId = replacedByTokenId;
    }
}
