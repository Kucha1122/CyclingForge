using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Garmin.Application.Commands.ConnectGarmin;

public sealed record ConnectGarminCommand(Guid UserId, string Email, string Password) : ICommand;
