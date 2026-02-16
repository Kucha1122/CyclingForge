namespace CyclingForge.Modules.Activities.Application.Services;

internal sealed class PowerProfileAnalyzer : IPowerProfileAnalyzer
{
    // Power profile benchmarks (watts/kg) for trained cyclists
    private static readonly Dictionary<string, (float min, float max)> Benchmarks = new()
    {
        { "5sec", (11.0f, 24.0f) },      // Sprinter
        { "1min", (6.0f, 12.5f) },       // Anaerobic capacity
        { "5min", (4.0f, 7.5f) },        // VO2 max
        { "20min", (3.0f, 5.5f) },       // FTP zone
        { "60min", (2.5f, 4.5f) }        // Endurance
    };

    public PowerProfile AnalyzePowerProfile(IEnumerable<float> powerData, float? weightKg)
    {
        if (powerData == null || !powerData.Any())
            return new PowerProfile();

        var powers = powerData.ToList();
        
        var profile = new PowerProfile
        {
            FiveSecondPower = CalculateMaxPower(powers, 5),
            OneMinutePower = CalculateMaxPower(powers, 60),
            FiveMinutePower = CalculateMaxPower(powers, 300),
            TwentyMinutePower = CalculateMaxPower(powers, 1200),
            OneHourPower = CalculateMaxPower(powers, 3600)
        };

        // Calculate normalized scores if weight is available
        if (weightKg.HasValue && weightKg.Value > 0)
        {
            var scores = new Dictionary<string, float>();
            
            if (profile.FiveSecondPower.HasValue)
                scores["Sprint"] = NormalizeScore(profile.FiveSecondPower.Value / weightKg.Value, Benchmarks["5sec"]);
            
            if (profile.OneMinutePower.HasValue)
                scores["Anaerobic"] = NormalizeScore(profile.OneMinutePower.Value / weightKg.Value, Benchmarks["1min"]);
            
            if (profile.FiveMinutePower.HasValue)
                scores["VO2Max"] = NormalizeScore(profile.FiveMinutePower.Value / weightKg.Value, Benchmarks["5min"]);
            
            if (profile.TwentyMinutePower.HasValue)
                scores["Threshold"] = NormalizeScore(profile.TwentyMinutePower.Value / weightKg.Value, Benchmarks["20min"]);
            
            if (profile.OneHourPower.HasValue)
                scores["Endurance"] = NormalizeScore(profile.OneHourPower.Value / weightKg.Value, Benchmarks["60min"]);

            var strength = scores.OrderByDescending(s => s.Value).FirstOrDefault();
            var weakness = scores.OrderBy(s => s.Value).FirstOrDefault();

            return new PowerProfile
            {
                FiveSecondPower = profile.FiveSecondPower,
                OneMinutePower = profile.OneMinutePower,
                FiveMinutePower = profile.FiveMinutePower,
                TwentyMinutePower = profile.TwentyMinutePower,
                OneHourPower = profile.OneHourPower,
                NormalizedScores = scores,
                PrimaryStrength = strength.Key,
                PrimaryWeakness = weakness.Key
            };
        }

        return profile;
    }

    public string DetermineRiderType(PowerProfile profile)
    {
        if (profile.NormalizedScores == null || !profile.NormalizedScores.Any())
            return "Unknown";

        var sprint = profile.NormalizedScores.GetValueOrDefault("Sprint", 0);
        var anaerobic = profile.NormalizedScores.GetValueOrDefault("Anaerobic", 0);
        var vo2max = profile.NormalizedScores.GetValueOrDefault("VO2Max", 0);
        var threshold = profile.NormalizedScores.GetValueOrDefault("Threshold", 0);
        var endurance = profile.NormalizedScores.GetValueOrDefault("Endurance", 0);

        // Sprinter: High sprint and anaerobic
        if (sprint > 70 && anaerobic > 65)
            return "Sprinter";

        // Puncheur: High VO2max and anaerobic
        if (vo2max > 70 && anaerobic > 65)
            return "Puncheur";

        // Climber: High VO2max and threshold with lower weight
        if (vo2max > 70 && threshold > 70)
            return "Climber";

        // Time Trialist: High threshold and endurance
        if (threshold > 70 && endurance > 70)
            return "Time Trialist";

        // All-rounder: Balanced across all zones
        var avgScore = profile.NormalizedScores.Values.Average();
        var variance = profile.NormalizedScores.Values.Select(s => Math.Pow(s - avgScore, 2)).Average();
        if (variance < 100 && avgScore > 50)
            return "All-Rounder";

        return "Developing";
    }

    private static float? CalculateMaxPower(List<float> powerData, int durationSeconds)
    {
        if (powerData.Count < durationSeconds)
            return null;

        float maxAvg = 0;
        
        for (int i = 0; i <= powerData.Count - durationSeconds; i++)
        {
            var windowAverage = powerData.Skip(i).Take(durationSeconds).Average();
            if (windowAverage > maxAvg)
                maxAvg = windowAverage;
        }

        return maxAvg > 0 ? maxAvg : null;
    }

    private static float NormalizeScore(float wattsPerKg, (float min, float max) benchmark)
    {
        // Map the value to a 0-100 scale based on the benchmark range
        if (wattsPerKg <= benchmark.min)
            return 0;
        
        if (wattsPerKg >= benchmark.max)
            return 100;

        var range = benchmark.max - benchmark.min;
        var score = ((wattsPerKg - benchmark.min) / range) * 100;
        
        return (float)score;
    }
}
