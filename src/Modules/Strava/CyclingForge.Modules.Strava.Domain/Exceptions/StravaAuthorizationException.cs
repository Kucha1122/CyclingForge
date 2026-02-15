using CyclingForge.Shared.Abstractions.Exceptions;

namespace CyclingForge.Modules.Strava.Domain.Exceptions;

public sealed class StravaAuthorizationException : CyclingForgeException
{
    public StravaAuthorizationException(string message)
        : base($"Strava authorization failed: {message}")
    {
    }
}
