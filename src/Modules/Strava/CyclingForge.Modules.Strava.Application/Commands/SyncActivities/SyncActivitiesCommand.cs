using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Strava.Application.Commands.SyncActivities;

public sealed record SyncActivitiesCommand(Guid UserId, bool ForceFullSync = false) : ICommand;
