using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Activities.Application.Commands.SyncActivities;

public sealed record SyncActivitiesCommand(Guid UserId) : ICommand<int>;
