using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Garmin.Application.Commands.SaveSyncPreference;

public sealed record SaveSyncPreferenceCommand(
    Guid UserId,
    IReadOnlyList<string> SyncTimes,
    bool Enabled,
    string? TimeZoneId) : ICommand;
