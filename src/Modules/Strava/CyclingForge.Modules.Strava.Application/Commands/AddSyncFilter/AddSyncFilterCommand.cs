using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Strava.Application.Commands.AddSyncFilter;

public sealed record AddSyncFilterCommand(Guid UserId, string ActivityType, string ExcludedDevicePattern) : ICommand;
