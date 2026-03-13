using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Garmin.Application.Commands.AuthorizeGarmin;

public sealed record AuthorizeGarminCommand(Guid UserId, string OAuthToken, string OAuthVerifier) : ICommand;
