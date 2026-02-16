using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Activities.Domain.ValueObjects;
using CyclingForge.Modules.Activities.Domain.Events;

namespace CyclingForge.Modules.Activities.Domain.Entities;

public sealed class Activity : AggregateRoot<ActivityId>
{
    public Guid UserId { get; private set; }
    public long StravaActivityId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public ActivityType Type { get; private set; } = default!;
    public DateTime StartDate { get; private set; }
    public Distance Distance { get; private set; } = default!;
    public Duration MovingTime { get; private set; } = default!;
    public Duration ElapsedTime { get; private set; } = default!;
    public float TotalElevationGain { get; private set; }
    public float? AverageSpeed { get; private set; }
    public float? MaxSpeed { get; private set; }
    public float? AverageHeartRate { get; private set; }
    public float? MaxHeartRate { get; private set; }
    public float? AveragePower { get; private set; }
    public float? MaxPower { get; private set; }
    public float? NormalizedPower { get; private set; }
    public float? IntensityFactor { get; private set; }
    public float? TrainingStressScore { get; private set; }
    public DateTime SyncedAt { get; private set; }

    private Activity() { }

    public static Activity Create(
        Guid userId,
        long stravaActivityId,
        string name,
        ActivityType type,
        DateTime startDate,
        Distance distance,
        Duration movingTime,
        Duration elapsedTime,
        float totalElevationGain,
        float? averageSpeed,
        float? maxSpeed,
        float? averageHeartRate,
        float? maxHeartRate,
        float? averagePower,
        DateTime syncedAt)
    {
        var activity = new Activity
        {
            Id = new ActivityId(Guid.NewGuid()),
            UserId = userId,
            StravaActivityId = stravaActivityId,
            Name = name,
            Type = type,
            StartDate = startDate,
            Distance = distance,
            MovingTime = movingTime,
            ElapsedTime = elapsedTime,
            TotalElevationGain = totalElevationGain,
            AverageSpeed = averageSpeed,
            MaxSpeed = maxSpeed,
            AverageHeartRate = averageHeartRate,
            MaxHeartRate = maxHeartRate,
            AveragePower = averagePower,
            SyncedAt = syncedAt
        };

        activity.AddDomainEvent(new ActivitySyncedEvent(activity.Id, userId, stravaActivityId));
        return activity;
    }

    public void Update(
        string name,
        Distance distance,
        Duration movingTime,
        Duration elapsedTime,
        float totalElevationGain,
        float? averageSpeed,
        float? maxSpeed,
        float? averageHeartRate,
        float? maxHeartRate,
        float? averagePower,
        DateTime syncedAt)
    {
        Name = name;
        Distance = distance;
        MovingTime = movingTime;
        ElapsedTime = elapsedTime;
        TotalElevationGain = totalElevationGain;
        AverageSpeed = averageSpeed;
        MaxSpeed = maxSpeed;
        AverageHeartRate = averageHeartRate;
        MaxHeartRate = maxHeartRate;
        AveragePower = averagePower;
        SyncedAt = syncedAt;
    }

    public void UpdateMetrics(
        float? maxPower,
        float? normalizedPower,
        float? intensityFactor,
        float? trainingStressScore)
    {
        MaxPower = maxPower;
        NormalizedPower = normalizedPower;
        IntensityFactor = intensityFactor;
        TrainingStressScore = trainingStressScore;
    }
}
