namespace CyclingForge.Modules.Activities.Application.Services;

public sealed class PowerProfile
{
    public float? FiveSecondPower { get; init; }
    public float? OneMinutePower { get; init; }
    public float? FiveMinutePower { get; init; }
    public float? TwentyMinutePower { get; init; }
    public float? OneHourPower { get; init; }
    
    public string? PrimaryStrength { get; init; }
    public string? PrimaryWeakness { get; init; }
    public Dictionary<string, float> NormalizedScores { get; init; } = new();
}

public interface IPowerProfileAnalyzer
{
    PowerProfile AnalyzePowerProfile(IEnumerable<float> powerData, float? weightKg);
    string DetermineRiderType(PowerProfile profile);
}
