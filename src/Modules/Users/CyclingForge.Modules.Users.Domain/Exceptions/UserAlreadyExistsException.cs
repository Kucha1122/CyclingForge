using CyclingForge.Shared.Abstractions.Exceptions;

namespace CyclingForge.Modules.Users.Domain.Exceptions;

public sealed class UserAlreadyExistsException : CyclingForgeException
{
    public string Email { get; }

    public UserAlreadyExistsException(string email)
        : base($"User with email '{email}' already exists.")
    {
        Email = email;
    }
}
