using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Garmin.Application.Commands.ConnectGarmin;

public sealed record ConnectGarminMfaCommand(Guid UserId, string SessionId, string MfaCode) : ICommand;
