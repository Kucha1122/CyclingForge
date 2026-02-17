namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Estimates FTP (eFTP) from a power-duration profile, approximating the behaviour of platforms like Intervals.icu.
/// </summary>
public interface IEftpEstimator
{
    /// <summary>
    /// Estimates FTP from the provided <see cref="PowerProfile"/> using the best effort of duration &gt;= minDurationSeconds.
    /// Returns null when no efforts meet the minimum duration (intervals.icu: 1 maximal effort 180s–30min, configurable).
    /// </summary>
    /// <param name="profile">Power profile for a single activity.</param>
    /// <param name="minDurationSeconds">Minimum effort duration in seconds (e.g. 300 = 5 min). Default 300.</param>
    /// <returns>Estimated FTP in watts, or null when it cannot be estimated.</returns>
    float? EstimateFtpFromPowerProfile(PowerProfile profile, int minDurationSeconds = 300);
}

