namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Two-parameter Critical Power model: <c>P(t) = W'/t + CP</c>.
/// Solved from two mean-maximal efforts (a short and a longer one).
/// CP approximates sustainable (~1h) power and is used as an FTP-equivalent;
/// W' is the anaerobic work capacity (joules).
/// </summary>
internal static class CriticalPowerModel
{
    /// <summary>
    /// Fits CP/W' from two (duration, power) points where the shorter effort has the higher power.
    /// Returns null when the inputs are non-positive or do not describe a decaying power-duration curve
    /// (short power must exceed long power, otherwise the model is undefined / degenerate).
    /// </summary>
    public static (float CriticalPower, float WPrime)? Estimate(
        int shortDurationSeconds, float shortPower,
        int longDurationSeconds, float longPower)
    {
        if (shortDurationSeconds <= 0 || longDurationSeconds <= 0 || shortDurationSeconds >= longDurationSeconds)
            return null;

        if (shortPower <= 0 || longPower <= 0 || shortPower <= longPower)
            return null;

        // W' = (Pshort - Plong) / (1/tShort - 1/tLong); CP = Plong - W'/tLong
        var wPrime = (shortPower - longPower) / (1f / shortDurationSeconds - 1f / longDurationSeconds);
        var criticalPower = longPower - wPrime / longDurationSeconds;

        if (criticalPower <= 0 || wPrime <= 0)
            return null;

        return (criticalPower, wPrime);
    }
}
