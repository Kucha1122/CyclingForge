using CyclingForge.Shared.Abstractions.Exceptions;

namespace CyclingForge.Modules.Garmin.Domain.Exceptions;

public sealed class GarminAuthorizationException : CyclingForgeException
{
    public GarminAuthorizationException(string message)
        : base($"Garmin authorization failed: {message}")
    {
    }
}
