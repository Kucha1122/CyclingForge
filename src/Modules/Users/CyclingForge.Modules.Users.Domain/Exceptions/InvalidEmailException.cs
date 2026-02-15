using CyclingForge.Shared.Abstractions.Exceptions;

namespace CyclingForge.Modules.Users.Domain.Exceptions;

public sealed class InvalidEmailException : CyclingForgeException
{
    public string Email { get; }

    public InvalidEmailException(string email)
        : base($"Email '{email}' is invalid.")
    {
        Email = email;
    }
}
