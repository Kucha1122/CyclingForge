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

    public float? CalculateIntensityFactor(float? normalizedPower, int? ftp)
    {
        if (!normalizedPower.HasValue || !ftp.HasValue || ftp.Value <= 0)
            return null;

        return normalizedPower.Value / ftp.Value;
    }

    public float? CalculateTrainingStressScore(float? normalizedPower, float? intensityFactor, int durationSeconds, int? ftp)
    {
        if (!normalizedPower.HasValue || !intensityFactor.HasValue || !ftp.HasValue || ftp.Value <= 0)
            return null;

        // TSS = (duration_seconds * NP * IF) / (FTP * 3600) * 100
        var tss = (durationSeconds * normalizedPower.Value * intensityFactor.Value) / (ftp.Value * 36);
        
        return (float)tss;
    }

    public float? CalculateHeartRateBasedTss(float? averageHeartRate, float? lactateThresholdHeartRate, int durationSeconds)
    {
        if (!averageHeartRate.HasValue || !lactateThresholdHeartRate.HasValue || lactateThresholdHeartRate.Value <= 0)
            return null;

        var durationMinutes = durationSeconds / 60.0;
        var hrRatio = averageHeartRate.Value / lactateThresholdHeartRate.Value;
        
        // hrTSS = duration_minutes * (avgHR / LTHR)^2 * 100 / 60
        var hrTss = durationMinutes * hrRatio * hrRatio * 100 / 60;

        return (float)hrTss;
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
