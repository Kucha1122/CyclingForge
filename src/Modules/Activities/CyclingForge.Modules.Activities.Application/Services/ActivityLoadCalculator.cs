using CyclingForge.Modules.Activities.Domain.Entities;

namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Implementation of activity load calculator with sport-specific adjustments.
/// Follows Intervals.icu behavior: power-based TSS for activities with power meters,
/// HRSS with sport factors for activities without power.
/// </summary>
internal sealed class ActivityLoadCalculator : IActivityLoadCalculator
{
    private readonly ITrainingMetricsCalculator _metricsCalculator;
    private readonly ActivityLoadConfiguration _configuration;

    public ActivityLoadCalculator(
        ITrainingMetricsCalculator metricsCalculator)
    {
        _metricsCalculator = metricsCalculator;
        _configuration = new ActivityLoadConfiguration();
    }
    
    // Constructor for when configuration is injected
    public ActivityLoadCalculator(
        ITrainingMetricsCalculator metricsCalculator,
        ActivityLoadConfiguration configuration)
    {
        _metricsCalculator = metricsCalculator;
        _configuration = configuration ?? new ActivityLoadConfiguration();
    }

    public Task<float?> CalculateLoadAsync(
        Activity activity,
        int? ftp,
        (int? lthr, int? maxHr, int? restingHr, string gender) hrZones,
        CancellationToken cancellationToken = default)
    {
        if (activity == null)
        {
            return Task.FromResult<float?>(null);
        }

        // Priority 0: If we have NormalizedPower and FTP, use power-based TSS regardless of DeviceWatts.
        // Strava's device_watts is often null; Intervals.icu will still use power when power is present.
        if (activity.NormalizedPower.HasValue && ftp.HasValue && ftp.Value > 0 && activity.MovingTime.Seconds > 0)
        {
            var np = activity.NormalizedPower.Value;
            var ifValue = np / ftp.Value;
            var tss = (activity.MovingTime.Seconds * np * ifValue) / (ftp.Value * 36f);
            return Task.FromResult<float?>(tss);
        }

        // Priority 1: Use stored TSS if activity has power with device_watts=true
        // This means real power meter data, should use as-is without sport factor
        if (activity.DeviceWatts == true && activity.NormalizedPower.HasValue && activity.TrainingStressScore.HasValue)
        {
            // Recompute with current FTP if available (already done in PerformanceManagementService)
            if (ftp.HasValue && ftp.Value > 0 && activity.MovingTime.Seconds > 0)
            {
                var np = activity.NormalizedPower.Value;
                var ifValue = np / ftp.Value;
                var tss = (activity.MovingTime.Seconds * np * ifValue) / (ftp.Value * 36f);
                return Task.FromResult<float?>(tss);
            }
            
            return Task.FromResult<float?>(activity.TrainingStressScore.Value);
        }

        // Priority 2: For non-power activities (device_watts != true), prefer the stored TrainingStressScore.
        // We already store sport-adjusted load at sync time (e.g. Walk: raw HR-TSS * 0.33),
        // so applying sportFactor again would double-scale and flatten CTL/ATL.
        if (activity.DeviceWatts != true && activity.TrainingStressScore.HasValue)
        {
            return Task.FromResult<float?>(activity.TrainingStressScore.Value);
        }

        // Priority 3: Calculate HRSS for activities without power when stored TSS is missing.
        if (activity.AverageHeartRate.HasValue &&
            hrZones.maxHr.HasValue &&
            hrZones.restingHr.HasValue &&
            hrZones.lthr.HasValue)
        {
            var hrss = _metricsCalculator.CalculateHrss(
                activity.AverageHeartRate,
                activity.MovingTime.Seconds,
                hrZones.maxHr,
                hrZones.restingHr,
                hrZones.lthr,
                hrZones.gender);

            if (hrss.HasValue)
            {
                var activityType = activity.Type?.Value ?? "Unknown";
                var sportFactor = GetSportFactorMultiplier(activityType);
                var adjustedLoad = hrss.Value * sportFactor;
                return Task.FromResult<float?>(adjustedLoad);
            }
        }

        return Task.FromResult<float?>(null);
    }

    public float GetSportFactorMultiplier(string activityType)
    {
        var settings = _configuration.GetSportFactor(activityType);
        return settings.TssMultiplier;
    }
}
