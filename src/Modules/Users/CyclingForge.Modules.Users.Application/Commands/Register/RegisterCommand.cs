using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Users.Application.Commands.Register;

public sealed record RegisterCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName) : ICommand<Guid>;
