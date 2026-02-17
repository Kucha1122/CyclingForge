using CyclingForge.Modules.Activities.Domain.Entities;

namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Service for calculating activity training load (TSS/HRSS) with sport-specific adjustments.
/// Implements Intervals.icu behavior where different activity types have different load factors.
/// </summary>
public interface IActivityLoadCalculator
{
    /// <summary>
    /// Calculates the training load for an activity.
    /// Uses power-based TSS when available (device_watts=true), otherwise uses HRSS with sport-specific multipliers.
    /// </summary>
    /// <param name="activity">The activity entity with metrics</param>
    /// <param name="ftp">User's FTP (for power-based TSS)</param>
    /// <param name="hrZones">Heart rate zones (maxHr, restingHr, lthr, gender)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Training load value, or null if cannot be calculated</returns>
    Task<float?> CalculateLoadAsync(
        Activity activity,
        int? ftp,
        (int? lthr, int? maxHr, int? restingHr, string gender) hrZones,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the sport factor multiplier for a specific activity type.
    /// </summary>
    /// <param name="activityType">Activity type (e.g., "Walk", "Ride", "Run")</param>
    /// <returns>Sport factor multiplier</returns>
    float GetSportFactorMultiplier(string activityType);
}
