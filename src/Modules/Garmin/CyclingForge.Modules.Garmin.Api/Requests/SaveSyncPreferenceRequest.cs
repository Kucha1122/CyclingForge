namespace CyclingForge.Modules.Garmin.Api.Requests;

public sealed record SaveSyncPreferenceRequest(
    IReadOnlyList<string> SyncTimes,
    bool Enabled,
    string? TimeZoneId);
