namespace CyclingForge.Shared.Abstractions.Exceptions;

/// <summary>Maps to HTTP 401 — used when credentials/refresh tokens are invalid or expired.</summary>
public sealed class UnauthorizedException : CyclingForgeException
{
    public UnauthorizedException(string message) : base(message)
    {
    }
}
