namespace CyclingForge.Shared.Abstractions.Services;

public interface IReadinessDataProvider
{
    Task<ReadinessData> GetReadinessDataAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
}

public sealed class ReadinessData
{
    public float? TSB { get; init; }
    public float? CTL { get; init; }
    public float? ATL { get; init; }
    public int? BodyBatteryMax { get; init; }
    public int? SleepScore { get; init; }
    public int? TrainingReadinessScore { get; init; }
    public int? AverageStressLevel { get; init; }
    public int? UserFtp { get; init; }
    public bool HasGarminData { get; init; }
    public bool HasPmcData { get; init; }
}
