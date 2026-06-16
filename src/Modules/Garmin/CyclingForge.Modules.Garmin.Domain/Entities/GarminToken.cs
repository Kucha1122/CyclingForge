using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Garmin.Domain.ValueObjects;

namespace CyclingForge.Modules.Garmin.Domain.Entities;

public sealed class GarminToken : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }

    /// <summary>Serialized garth session (OAuth2 token) returned by the Python service.</summary>
    public AccessToken Token { get; private set; } = default!;
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private GarminToken() { }

    public static GarminToken Create(
        Guid userId,
        AccessToken session,
        DateTime createdAt)
    {
        return new GarminToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = session,
            CreatedAt = createdAt
        };
    }

    public void UpdateToken(AccessToken session, DateTime updatedAt)
    {
        Token = session;
        UpdatedAt = updatedAt;
    }
}
