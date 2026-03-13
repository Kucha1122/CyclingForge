using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Garmin.Domain.ValueObjects;

namespace CyclingForge.Modules.Garmin.Domain.Entities;

public sealed class GarminToken : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public AccessToken Token { get; private set; } = default!;
    public string TokenSecret { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private GarminToken() { }

    public static GarminToken Create(
        Guid userId,
        AccessToken accessToken,
        string tokenSecret,
        DateTime createdAt)
    {
        return new GarminToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = accessToken,
            TokenSecret = tokenSecret,
            CreatedAt = createdAt
        };
    }

    public void UpdateTokens(AccessToken accessToken, string tokenSecret, DateTime updatedAt)
    {
        Token = accessToken;
        TokenSecret = tokenSecret;
        UpdatedAt = updatedAt;
    }
}
