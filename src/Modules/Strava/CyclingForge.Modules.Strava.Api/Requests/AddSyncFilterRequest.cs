namespace CyclingForge.Modules.Strava.Api.Requests;

public sealed record AddSyncFilterRequest(string ActivityType, string ExcludedDevicePattern);
