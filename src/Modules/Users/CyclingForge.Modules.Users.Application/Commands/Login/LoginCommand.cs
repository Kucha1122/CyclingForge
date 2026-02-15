using CyclingForge.Modules.Users.Application.DTOs;
using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Users.Application.Commands.Login;

public sealed record LoginCommand(string Email, string Password) : ICommand<AuthResultDto>;
