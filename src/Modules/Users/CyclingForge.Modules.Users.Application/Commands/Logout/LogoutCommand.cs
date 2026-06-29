using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.Logout;

public sealed record LogoutCommand(string RefreshToken) : IRequest;
