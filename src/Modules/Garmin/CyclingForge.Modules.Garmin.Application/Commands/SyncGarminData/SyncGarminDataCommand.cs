using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Garmin.Application.Commands.SyncGarminData;

public sealed record SyncGarminDataCommand(Guid UserId, int DaysBack = 7) : ICommand;
