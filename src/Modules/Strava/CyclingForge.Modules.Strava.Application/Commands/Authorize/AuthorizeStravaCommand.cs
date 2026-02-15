using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Strava.Application.Commands.Authorize;

public sealed record AuthorizeStravaCommand(Guid UserId, string AuthorizationCode) : ICommand;
