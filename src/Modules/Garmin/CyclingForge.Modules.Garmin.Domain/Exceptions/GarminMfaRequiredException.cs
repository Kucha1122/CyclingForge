using CyclingForge.Shared.Abstractions.Exceptions;

namespace CyclingForge.Modules.Garmin.Domain.Exceptions;

public sealed class GarminMfaRequiredException : CyclingForgeException
{
    public string SessionId { get; }

    public GarminMfaRequiredException(string sessionId)
        : base("Garmin account requires 2FA. Submit the code to complete the connection.")
    {
        SessionId = sessionId;
    }
}
