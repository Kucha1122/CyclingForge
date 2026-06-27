using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetSyncPreference;

public sealed record GetSyncPreferenceQuery(Guid UserId) : IQuery<GarminSyncPreferenceDto>;

public sealed record GarminSyncPreferenceDto(
    IReadOnlyList<string> SyncTimes,
    bool Enabled,
    string TimeZoneId);
