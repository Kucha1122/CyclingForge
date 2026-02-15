using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Strava.Domain.ValueObjects;

namespace CyclingForge.Modules.Strava.Domain.Entities;

public sealed class StravaToken : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public StravaAthleteId AthleteId { get; private set; } = default!;
    public AccessToken Token { get; private set; } = default!;
    public string RefreshToken { get; private set; } = string.Empty;
    public DateTime ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private StravaToken() { }

    public static StravaToken Create(
        Guid userId,
        StravaAthleteId athleteId,
        AccessToken accessToken,
        string refreshToken,
        DateTime expiresAt,
        DateTime createdAt)
    {
        return new StravaToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AthleteId = athleteId,
            Token = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            CreatedAt = createdAt
        };
    }

    public void UpdateTokens(AccessToken accessToken, string refreshToken, DateTime expiresAt, DateTime updatedAt)
    {
        Token = accessToken;
        RefreshToken = refreshToken;
        ExpiresAt = expiresAt;
        UpdatedAt = updatedAt;
    }

    public bool IsExpired(DateTime now) => ExpiresAt <= now;
}
