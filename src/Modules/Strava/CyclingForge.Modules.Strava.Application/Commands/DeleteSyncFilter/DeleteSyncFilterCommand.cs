using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Strava.Application.Commands.DeleteSyncFilter;

public sealed record DeleteSyncFilterCommand(Guid UserId, Guid FilterId) : ICommand;
