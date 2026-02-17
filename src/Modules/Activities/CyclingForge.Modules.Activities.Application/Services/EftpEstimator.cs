namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Default implementation of <see cref="IEftpEstimator"/> based on multiple steady-state efforts
/// (5, 20 and 60 minutes) with duration-dependent correction factors, inspired by Intervals.icu behaviour.
/// </summary>
internal sealed class EftpEstimator : IEftpEstimator
{
    /// <inheritdoc />
    public float? EstimateFtpFromPowerProfile(PowerProfile profile, int minDurationSeconds = 300)
    {
        if (profile is null)
        {
            return null;
        }

        // Collect candidate intervals (duration in seconds, average power in watts).
        // Only include efforts >= minDurationSeconds (intervals.icu: configurable min, e.g. 180–1800).
        var candidates = new List<(int DurationSeconds, float Power)>();

        if (profile.FiveMinutePower is { } fiveMin && fiveMin > 0 && 300 >= minDurationSeconds)
        {
            candidates.Add((300, fiveMin));
        }

        if (profile.TwentyMinutePower is { } twentyMin && twentyMin > 0 && 1200 >= minDurationSeconds)
        {
            candidates.Add((1200, twentyMin));
        }

        if (profile.OneHourPower is { } oneHour && oneHour > 0 && 3600 >= minDurationSeconds)
        {
            candidates.Add((3600, oneHour));
        }

        if (candidates.Count == 0)
        {
            return null;
        }

        float bestEftp = 0;

        foreach (var (durationSeconds, power) in candidates)
        {
            var factor = GetCorrectionFactor(durationSeconds, minDurationSeconds);
            if (factor <= 0)
            {
                continue;
            }

            var candidate = power * factor;
            if (candidate > bestEftp)
            {
                bestEftp = candidate;
            }
        }

        return bestEftp > 0 ? bestEftp : null;
    }

    private static float GetCorrectionFactor(int durationSeconds, int minDurationSeconds)
    {
        if (durationSeconds < minDurationSeconds)
            return 0f;

        // Intervals.icu-style: map effort to equivalent 1h power (eFTP). FastFitness / 95% of 20m rule.
        if (durationSeconds >= 3600)
            return 0.98f;
        if (durationSeconds >= 1800)
            return 0.97f;
        if (durationSeconds >= 1200)
            return 0.95f;
        if (durationSeconds >= 600)
            return 0.90f;
        if (durationSeconds >= 300)
            return 0.75f;
        if (durationSeconds >= 180)
            return 0.72f; // 3 min: more anaerobic, lower factor

        return 0f;
    }
}

