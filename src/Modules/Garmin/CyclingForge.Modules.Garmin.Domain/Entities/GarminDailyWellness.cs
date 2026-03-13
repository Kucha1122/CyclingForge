using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Garmin.Domain.Entities;

public sealed class GarminDailyWellness : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public DateOnly Date { get; private set; }
    public float? Vo2MaxMlPerMinPerKg { get; private set; }
    public int? TrainingReadinessScore { get; private set; }
    public string? TrainingReadinessLevel { get; private set; }
    public int? BodyBatteryMin { get; private set; }
    public int? BodyBatteryMax { get; private set; }
    public int? AverageStressLevel { get; private set; }
    public int? StepsCount { get; private set; }
    public DateTime SyncedAt { get; private set; }

    private GarminDailyWellness() { }

    public static GarminDailyWellness Create(
        Guid userId,
        DateOnly date,
        float? vo2Max,
        int? trainingReadinessScore,
        string? trainingReadinessLevel,
        int? bodyBatteryMin,
        int? bodyBatteryMax,
        int? averageStressLevel,
        int? stepsCount,
        DateTime syncedAt)
    {
        return new GarminDailyWellness
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Date = date,
            Vo2MaxMlPerMinPerKg = vo2Max,
            TrainingReadinessScore = trainingReadinessScore,
            TrainingReadinessLevel = trainingReadinessLevel,
            BodyBatteryMin = bodyBatteryMin,
            BodyBatteryMax = bodyBatteryMax,
            AverageStressLevel = averageStressLevel,
            StepsCount = stepsCount,
            SyncedAt = syncedAt
        };
    }

    public void Update(
        float? vo2Max,
        int? trainingReadinessScore,
        string? trainingReadinessLevel,
        int? bodyBatteryMin,
        int? bodyBatteryMax,
        int? averageStressLevel,
        int? stepsCount,
        DateTime syncedAt)
    {
        Vo2MaxMlPerMinPerKg = vo2Max;
        TrainingReadinessScore = trainingReadinessScore;
        TrainingReadinessLevel = trainingReadinessLevel;
        BodyBatteryMin = bodyBatteryMin;
        BodyBatteryMax = bodyBatteryMax;
        AverageStressLevel = averageStressLevel;
        StepsCount = stepsCount;
        SyncedAt = syncedAt;
    }
}
