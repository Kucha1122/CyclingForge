using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Garmin.Domain.Entities;

public sealed class GarminHrvData : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public DateOnly Date { get; private set; }
    public int? LastNightAvgMs { get; private set; }
    public int? LastNight5MinHighMs { get; private set; }
    public string? Status { get; private set; }
    public DateTime SyncedAt { get; private set; }

    private GarminHrvData() { }

    public static GarminHrvData Create(
        Guid userId,
        DateOnly date,
        int? lastNightAvgMs,
        int? lastNight5MinHighMs,
        string? status,
        DateTime syncedAt)
    {
        return new GarminHrvData
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Date = date,
            LastNightAvgMs = lastNightAvgMs,
            LastNight5MinHighMs = lastNight5MinHighMs,
            Status = status,
            SyncedAt = syncedAt
        };
    }

    public void Update(
        int? lastNightAvgMs,
        int? lastNight5MinHighMs,
        string? status,
        DateTime syncedAt)
    {
        LastNightAvgMs = lastNightAvgMs;
        LastNight5MinHighMs = lastNight5MinHighMs;
        Status = status;
        SyncedAt = syncedAt;
    }
}
