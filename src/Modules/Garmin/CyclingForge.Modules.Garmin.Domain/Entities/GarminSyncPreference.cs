using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Garmin.Domain.Entities;

/// <summary>
/// Per-user schedule for automatic Garmin background synchronization. The user configures at which
/// local times of day (e.g. 09:00 and 20:00) wellness/sleep/HRV data should be pulled.
/// </summary>
public sealed class GarminSyncPreference : AggregateRoot<Guid>
{
    /// <summary>Comma-separated list of "HH:mm" local times, e.g. "09:00,20:00".</summary>
    public string SyncTimesRaw { get; private set; } = string.Empty;
    public Guid UserId { get; private set; }
    public bool Enabled { get; private set; }
    public string TimeZoneId { get; private set; } = "Europe/Warsaw";
    public DateTime? LastSyncedAtUtc { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private GarminSyncPreference() { }

    public static GarminSyncPreference Create(
        Guid userId,
        IEnumerable<TimeOnly> syncTimes,
        bool enabled,
        string timeZoneId,
        DateTime createdAt)
    {
        return new GarminSyncPreference
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SyncTimesRaw = Serialize(syncTimes),
            Enabled = enabled,
            TimeZoneId = timeZoneId,
            CreatedAt = createdAt
        };
    }

    public void Update(IEnumerable<TimeOnly> syncTimes, bool enabled, string timeZoneId, DateTime updatedAt)
    {
        SyncTimesRaw = Serialize(syncTimes);
        Enabled = enabled;
        TimeZoneId = timeZoneId;
        UpdatedAt = updatedAt;
    }

    public void MarkSynced(DateTime syncedAtUtc)
    {
        LastSyncedAtUtc = syncedAtUtc;
    }

    public IReadOnlyList<TimeOnly> GetSyncTimes()
    {
        if (string.IsNullOrWhiteSpace(SyncTimesRaw))
        {
            return [];
        }

        return SyncTimesRaw
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => TimeOnly.TryParse(s, out var t) ? (TimeOnly?)t : null)
            .Where(t => t.HasValue)
            .Select(t => t!.Value)
            .OrderBy(t => t)
            .ToList();
    }

    private static string Serialize(IEnumerable<TimeOnly> syncTimes)
        => string.Join(',', syncTimes.OrderBy(t => t).Select(t => t.ToString("HH\\:mm")));
}
