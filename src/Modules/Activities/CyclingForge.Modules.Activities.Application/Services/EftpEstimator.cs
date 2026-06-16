namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Estimates eFTP from a single activity's power-duration profile, approximating Intervals.icu.
///
/// Each maximal effort is independently projected onto the standard power-duration ("fatigue")
/// curve <c>P(t) = P_ref * (t_ref/t)^b</c> to obtain an equivalent 1-hour power (eFTP), and the
/// highest projection across all eligible efforts is returned. This mirrors how Intervals.icu reads
/// eFTP off the power curve: a single strong effort at any duration is enough to lift the estimate.
///
/// This independent-projection design is what lets a ramp test be detected. A ramp test produces a
/// strong short (≈5 min) effort but no sustained 20-min effort, so a per-activity Critical-Power fit
/// (anchored on the weak 20-min point) would actually under-estimate. Projecting the strong 5-min
/// effort on its own through the standard curve captures the bump instead.
/// </summary>
internal sealed class EftpEstimator : IEftpEstimator
{
    // Exponent of the standard power-duration curve, anchored so that a 20-minute effort maps to
    // ~0.95x (the classic "FTP = 95% of best 20 min" rule): b = ln(0.95) / ln(3600/1200).
    // This yields ~0.89x for 5 min and 1.0x for 60 min — close to Intervals.icu's mapping.
    private const float ReferenceDurationSeconds = 3600f;
    private const float CurveExponent = -0.04667f;

    /// <inheritdoc />
    public float? EstimateFtpFromPowerProfile(PowerProfile profile, int minDurationSeconds = 300)
    {
        if (profile is null)
            return null;

        // Candidate maximal efforts (duration in seconds, average power). Only efforts at or above
        // the configured minimum duration are eligible — this excludes very short anaerobic efforts
        // (1–3 min) by default, where projecting onto the threshold curve would over-estimate.
        var candidates = new (int DurationSeconds, float? Power)[]
        {
            (60, profile.OneMinutePower),
            (300, profile.FiveMinutePower),
            (1200, profile.TwentyMinutePower),
            (3600, profile.OneHourPower),
        };

        float bestEftp = 0;

        foreach (var (durationSeconds, power) in candidates)
        {
            if (durationSeconds < minDurationSeconds || power is not { } p || p <= 0)
                continue;

            var candidate = p * CurveFactor(durationSeconds);
            if (candidate > bestEftp)
                bestEftp = candidate;
        }

        // Secondary candidate: a two-parameter Critical Power fit from the 5- and 20-minute efforts.
        // CP is an FTP-equivalent; including it in the max is harmless (it is generally <= the curve
        // projection) and keeps eFTP and the power-curve chart consistent.
        if (300 >= minDurationSeconds
            && profile.FiveMinutePower is { } p5 && profile.TwentyMinutePower is { } p20
            && CriticalPowerModel.Estimate(300, p5, 1200, p20) is { } fit
            && fit.CriticalPower > bestEftp)
        {
            bestEftp = fit.CriticalPower;
        }

        return bestEftp > 0 ? bestEftp : null;
    }

    // Maps an effort of the given duration to its equivalent reference-duration (1 h) power.
    private static float CurveFactor(int durationSeconds) =>
        MathF.Pow(ReferenceDurationSeconds / durationSeconds, CurveExponent);
}
