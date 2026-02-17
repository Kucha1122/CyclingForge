using CyclingForge.Modules.Strava.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Strava.Domain.Entities;

public sealed class StravaAthleteZones : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public StravaAthleteId AthleteId { get; private set; } = default!;
    public string? HeartRateZonesJson { get; private set; }
    public string? PowerZonesJson { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private StravaAthleteZones() { }

    public static StravaAthleteZones Create(
        Guid userId,
        StravaAthleteId athleteId,
        string? heartRateZonesJson,
        string? powerZonesJson,
        DateTime createdAt)
    {
        return new StravaAthleteZones
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AthleteId = athleteId,
            HeartRateZonesJson = heartRateZonesJson,
            PowerZonesJson = powerZonesJson,
            CreatedAt = createdAt
        };
    }

    public void Update(
        string? heartRateZonesJson,
        string? powerZonesJson,
        DateTime updatedAt)
    {
        HeartRateZonesJson = heartRateZonesJson;
        PowerZonesJson = powerZonesJson;
        UpdatedAt = updatedAt;
    }
}

