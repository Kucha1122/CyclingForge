namespace CyclingForge.Modules.Activities.Application.Services;

internal sealed class TrainingMetricsCalculator : ITrainingMetricsCalculator
{
    private const int RollingAverageWindowSeconds = 30;

    public float? CalculateNormalizedPower(IEnumerable<float> powerData)
    {
        if (powerData == null || !powerData.Any())
            return null;

        var powers = powerData.ToList();
        if (powers.Count == 0)
            return null;

        // Step 1: Calculate 30-second rolling average
        var rollingAverages = CalculateRollingAverage(powers, RollingAverageWindowSeconds);
        
        if (!rollingAverages.Any())
            return null;

        // Step 2: Raise each value to the 4th power
        var fourthPowers = rollingAverages.Select(p => Math.Pow(p, 4));

        // Step 3: Average the 4th power values
        var avgFourthPower = fourthPowers.Average();

        // Step 4: Take the 4th root
        var normalizedPower = Math.Pow(avgFourthPower, 0.25);

        return (float)normalizedPower;
    }

    /// <summary>
    /// Intensity Factor = NP / FTP (Science to Sport / Coggan; https://www.sciencetosport.com/monitoring-training-load/).
    /// </summary>
    public float? CalculateIntensityFactor(float? normalizedPower, int? ftp)
    {
        if (!normalizedPower.HasValue || !ftp.HasValue || ftp.Value <= 0)
            return null;

        return normalizedPower.Value / ftp.Value;
    }

    /// <summary>
    /// Training Stress Score: TSS = (NP/FTP)² × Duration (hours) × 100.
    /// Equivalent form: (duration_seconds × NP × IF) / (FTP × 3600) × 100. Science to Sport / Coggan (Allen &amp; Coggan, 2010).
    /// </summary>
    public float? CalculateTrainingStressScore(float? normalizedPower, float? intensityFactor, int durationSeconds, int? ftp)
    {
        if (!normalizedPower.HasValue || !intensityFactor.HasValue || !ftp.HasValue || ftp.Value <= 0)
            return null;

        // TSS = (NP/FTP)² × (durationSeconds/3600) × 100 = (duration_seconds * NP * IF) / (FTP * 3600) * 100
        var tss = (durationSeconds * normalizedPower.Value * intensityFactor.Value) / (ftp.Value * 36);

        return (float)tss;
    }

    public float? CalculateHeartRateBasedTss(float? averageHeartRate, float? lactateThresholdHeartRate, int durationSeconds)
    {
        if (!averageHeartRate.HasValue || !lactateThresholdHeartRate.HasValue || lactateThresholdHeartRate.Value <= 0)
            return null;
        var durationMinutes = durationSeconds / 60.0;
        var hrRatio = averageHeartRate.Value / lactateThresholdHeartRate.Value;
        var hrTss = durationMinutes * hrRatio * hrRatio * 100 / 60;
        return (float)hrTss;
    }

    /// <summary>
    /// HRSS (Normalized TRIMP) – Elevate/intervals.icu. Wymaga MaxHR i RestingHR.
    /// </summary>
    public float? CalculateHrss(float? averageHeartRate, int durationSeconds, int? maxHeartRate, int? restingHeartRate, int? lactateThresholdHeartRate, string gender = "male")
    {
        if (!averageHeartRate.HasValue || !maxHeartRate.HasValue || !restingHeartRate.HasValue || !lactateThresholdHeartRate.HasValue)
            return null;

        if (maxHeartRate.Value <= restingHeartRate.Value)
            return null;

        // HRSS calculation based on TRIMP
        // 1. Calculate Heart Rate Reserve (HRR) ratio for the activity
        // HRR = (AvgHR - RestingHR) / (MaxHR - RestingHR)
        var hrr = (averageHeartRate.Value - restingHeartRate.Value) / (float)(maxHeartRate.Value - restingHeartRate.Value);
        
        if (hrr < 0) hrr = 0;

        // 2. Calculate TRIMP (Training Impulse)
        // TRIMP = Duration(min) * HRR * 0.64 * exp(y * HRR)
        // y = 1.92 for men, 1.67 for women
        var durationMinutes = durationSeconds / 60.0;
        var y = gender.ToLower() == "female" ? 1.67 : 1.92;
        var trimp = durationMinutes * hrr * 0.64 * Math.Exp(y * hrr);

        // 3. Calculate Lactate Threshold TRIMP (TRIMP at LTHR) to normalize
        // HRR_LTHR = (LTHR - RestingHR) / (MaxHR - RestingHR)
        var hrrLthr = (lactateThresholdHeartRate.Value - restingHeartRate.Value) / (float)(maxHeartRate.Value - restingHeartRate.Value);
        var trimpLthrHour = 60.0 * hrrLthr * 0.64 * Math.Exp(y * hrrLthr);

        // 4. Calculate HRSS
        // HRSS = (TRIMP / TRIMP_LTHR_1h) * 100
        if (trimpLthrHour <= 0) return null;
        
        var hrss = (trimp / trimpLthrHour) * 100.0;
        return (float)hrss;
    }

    public float? CalculateHrssFromStream(IEnumerable<float>? hrStream, int durationSeconds, int? maxHeartRate, int? restingHeartRate, int? lactateThresholdHeartRate, string gender = "male")
    {
        if (hrStream == null || !maxHeartRate.HasValue || !restingHeartRate.HasValue || !lactateThresholdHeartRate.HasValue)
            return null;

        var hrData = hrStream.ToList();
        if (hrData.Count == 0)
            return null;

        // Apply 30-second smoothing filter to HR data (similar to NP for power)
        var smoothedHr = CalculateRollingAverage(hrData, RollingAverageWindowSeconds);
        
        float averageSmoothedHr;
        if (smoothedHr.Any())
        {
            averageSmoothedHr = smoothedHr.Average();
        }
        else
        {
            // If not enough data for smoothing, use raw average
            averageSmoothedHr = hrData.Average();
        }

        // Calculate HRSS using smoothed average HR
        return CalculateHrss(averageSmoothedHr, durationSeconds, maxHeartRate, restingHeartRate, lactateThresholdHeartRate, gender);
    }

    private static List<float> CalculateRollingAverage(List<float> data, int windowSize)
    {
        if (data.Count < windowSize)
            return data; // Return original if not enough data points

        var result = new List<float>();
        
        for (int i = 0; i <= data.Count - windowSize; i++)
        {
            var window = data.Skip(i).Take(windowSize);
            var average = window.Average();
            result.Add(average);
        }

        return result;
    }
}
