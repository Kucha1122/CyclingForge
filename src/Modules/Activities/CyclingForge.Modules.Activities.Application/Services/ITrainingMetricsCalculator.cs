namespace CyclingForge.Modules.Activities.Application.Services;

public interface ITrainingMetricsCalculator
{
    /// <summary>
    /// Calculates Normalized Power (NP) from power data
    /// </summary>
    float? CalculateNormalizedPower(IEnumerable<float> powerData);

    /// <summary>
    /// Calculates Intensity Factor (IF) from Normalized Power and FTP
    /// IF = NP / FTP
    /// </summary>
    float? CalculateIntensityFactor(float? normalizedPower, int? ftp);

    /// <summary>
    /// Calculates Training Stress Score (TSS) from NP, IF, and duration
    /// TSS = (duration_seconds * NP * IF) / (FTP * 3600) * 100
    /// </summary>
    float? CalculateTrainingStressScore(float? normalizedPower, float? intensityFactor, int durationSeconds, int? ftp);

    /// <summary>
    /// OBSOLETE: Simple HR-based TSS calculation. Use CalculateHrss instead for Intervals.icu compatibility.
    /// hrTSS = duration_minutes * (avgHR / LTHR)² * 100 / 60
    /// </summary>
    [Obsolete("Use CalculateHrss (TRIMP-based) for Intervals.icu compatibility")]
    float? CalculateHeartRateBasedTss(float? averageHeartRate, float? lactateThresholdHeartRate, int durationSeconds);

    /// <summary>
    /// Calculates HRSS (Normalized TRIMP) for activities without power data using heart rate.
    /// This aligns with Intervals.icu and provides more accurate load calculation than simple hrTSS.
    /// HRSS = (TRIMP / TRIMP_LTHR_1h) * 100, where TRIMP uses exponential Banister formula.
    /// </summary>
    float? CalculateHrss(float? averageHeartRate, int durationSeconds, int? maxHeartRate, int? restingHeartRate, int? lactateThresholdHeartRate, string gender = "male");

    /// <summary>
    /// Calculates HRSS with optional HR stream smoothing for more accurate results.
    /// When HR stream is provided, applies 30-second smoothing filter similar to NP calculation.
    /// </summary>
    float? CalculateHrssFromStream(IEnumerable<float>? hrStream, int durationSeconds, int? maxHeartRate, int? restingHeartRate, int? lactateThresholdHeartRate, string gender = "male");
}
