using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Strava.Application.Commands.RefreshToken;

public sealed record RefreshStravaTokenCommand(Guid UserId) : ICommand;
