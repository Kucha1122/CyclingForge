using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Garmin.Application.Commands.DisconnectGarmin;

public sealed record DisconnectGarminCommand(Guid UserId) : ICommand;
