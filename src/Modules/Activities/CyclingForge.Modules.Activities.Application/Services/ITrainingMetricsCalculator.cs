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
    /// Calculates TSS for activities without power data using heart rate
    /// hrTSS = duration_minutes * (avgHR / LTHR) * (avgHR / LTHR) * 100 / 60
    /// </summary>
    float? CalculateHeartRateBasedTss(float? averageHeartRate, float? lactateThresholdHeartRate, int durationSeconds);
}
