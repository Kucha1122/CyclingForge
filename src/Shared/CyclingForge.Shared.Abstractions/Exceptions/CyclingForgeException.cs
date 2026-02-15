namespace CyclingForge.Shared.Abstractions.Exceptions;

public abstract class CyclingForgeException : Exception
{
    protected CyclingForgeException(string message) : base(message)
    {
    }
}
