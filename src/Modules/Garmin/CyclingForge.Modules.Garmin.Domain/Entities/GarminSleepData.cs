using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Garmin.Domain.Entities;

public sealed class GarminSleepData : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public DateOnly Date { get; private set; }
    public int TotalSleepSeconds { get; private set; }
    public int DeepSleepSeconds { get; private set; }
    public int LightSleepSeconds { get; private set; }
    public int RemSleepSeconds { get; private set; }
    public int AwakeSeconds { get; private set; }
    public int? SleepScore { get; private set; }
    public float? AverageSpO2 { get; private set; }
    public float? AverageRespirationRate { get; private set; }
    public DateTime? SleepStartTime { get; private set; }
    public DateTime? SleepEndTime { get; private set; }
    /// <summary>JSON array of sleep-stage segments (from Garmin sleepMovement).</summary>
    public string? SleepLevelsJson { get; private set; }
    public DateTime SyncedAt { get; private set; }

    private GarminSleepData() { }

    public static GarminSleepData Create(
        Guid userId,
        DateOnly date,
        int totalSleepSeconds,
        int deepSleepSeconds,
        int lightSleepSeconds,
        int remSleepSeconds,
        int awakeSeconds,
        int? sleepScore,
        float? averageSpO2,
        float? averageRespirationRate,
        DateTime? sleepStartTime,
        DateTime? sleepEndTime,
        string? sleepLevelsJson,
        DateTime syncedAt)
    {
        return new GarminSleepData
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Date = date,
            TotalSleepSeconds = totalSleepSeconds,
            DeepSleepSeconds = deepSleepSeconds,
            LightSleepSeconds = lightSleepSeconds,
            RemSleepSeconds = remSleepSeconds,
            AwakeSeconds = awakeSeconds,
            SleepScore = sleepScore,
            AverageSpO2 = averageSpO2,
            AverageRespirationRate = averageRespirationRate,
            SleepStartTime = sleepStartTime,
            SleepEndTime = sleepEndTime,
            SleepLevelsJson = sleepLevelsJson,
            SyncedAt = syncedAt
        };
    }

    public void Update(
        int totalSleepSeconds,
        int deepSleepSeconds,
        int lightSleepSeconds,
        int remSleepSeconds,
        int awakeSeconds,
        int? sleepScore,
        float? averageSpO2,
        float? averageRespirationRate,
        DateTime? sleepStartTime,
        DateTime? sleepEndTime,
        string? sleepLevelsJson,
        DateTime syncedAt)
    {
        TotalSleepSeconds = totalSleepSeconds;
        DeepSleepSeconds = deepSleepSeconds;
        LightSleepSeconds = lightSleepSeconds;
        RemSleepSeconds = remSleepSeconds;
        AwakeSeconds = awakeSeconds;
        SleepScore = sleepScore;
        AverageSpO2 = averageSpO2;
        AverageRespirationRate = averageRespirationRate;
        SleepStartTime = sleepStartTime;
        SleepEndTime = sleepEndTime;
        SleepLevelsJson = sleepLevelsJson;
        SyncedAt = syncedAt;
    }
}
