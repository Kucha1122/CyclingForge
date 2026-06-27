namespace CyclingForge.Modules.Garmin.Application.Defaults;

/// <summary>Default Garmin background-sync schedule applied when a user has not configured one.</summary>
public static class GarminSyncDefaults
{
    public static readonly IReadOnlyList<TimeOnly> SyncTimes = [new TimeOnly(9, 0), new TimeOnly(20, 0)];
    public const bool Enabled = true;
    public const string TimeZoneId = "Europe/Warsaw";

    /// <summary>How many days back each automatic sync pulls (covers last night + previous day).</summary>
    public const int DaysBack = 2;

    /// <summary>Maximum number of distinct sync times a user may configure.</summary>
    public const int MaxSyncTimes = 6;
}
