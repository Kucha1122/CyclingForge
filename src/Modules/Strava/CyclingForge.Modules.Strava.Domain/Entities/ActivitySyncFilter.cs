using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Strava.Domain.Entities;

/// <summary>
/// A per-user rule that excludes activities of a given type when the Strava device_name
/// contains a specified substring (case-insensitive). Example: type "Ride", device pattern
/// "Garmin Epix" → all Ride activities recorded on a Garmin Epix (Gen 2, Pro, etc.) are skipped.
/// </summary>
public sealed class ActivitySyncFilter : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public string ActivityType { get; private set; } = string.Empty;
    public string ExcludedDevicePattern { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }

    private ActivitySyncFilter() { }

    public static ActivitySyncFilter Create(Guid userId, string activityType, string excludedDevicePattern, DateTime createdAt)
    {
        return new ActivitySyncFilter
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ActivityType = activityType,
            ExcludedDevicePattern = excludedDevicePattern,
            CreatedAt = createdAt
        };
    }

    public bool Matches(string? type, string? deviceName)
    {
        if (string.IsNullOrEmpty(type) || string.IsNullOrEmpty(deviceName))
            return false;

        return type.Contains(ActivityType, StringComparison.OrdinalIgnoreCase)
            && deviceName.Contains(ExcludedDevicePattern, StringComparison.OrdinalIgnoreCase);
    }
}
