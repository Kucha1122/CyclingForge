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
    /// <summary>FTP value used to compute TSS for this activity (effective FTP on activity date).</summary>
    public int? FtpUsed { get; private set; }
    /// <summary>Best 5-minute average power (W) from power stream. Used to recompute eFTP when user changes min duration.</summary>
    public float? Best5MinPower { get; private set; }
    /// <summary>Best 20-minute average power (W) from power stream. Used for eFTP = Best20MinPower * 0.95.</summary>
    public float? Best20MinPower { get; private set; }
    /// <summary>Best 60-minute average power (W) from power stream. Used to recompute eFTP when user changes min duration.</summary>
    public float? Best60MinPower { get; private set; }
    /// <summary>Estimated FTP (W) from this activity's power profile (multi-duration, Intervals.icu-style). Used for eFTP change detection.</summary>
    public int? EstimatedFtpFromActivity { get; private set; }
    /// <summary>
    /// Source of power data for PMC: true = real power meter (Strava device_watts); false = estimated power (e.g. from speed); null = no power.
    /// Only when true we use power-based TSS for PMC; when false or null we use HRSS for Ride/VirtualRide (intervals.icu behaviour).
    /// </summary>
    public bool? DeviceWatts { get; private set; }
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
        DateTime syncedAt,
        bool? deviceWatts = null)
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
            DeviceWatts = deviceWatts,
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
        DateTime syncedAt,
        bool? deviceWatts = null)
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
        DeviceWatts = deviceWatts;
        SyncedAt = syncedAt;
    }

    public void UpdateMetrics(
        float? maxPower,
        float? normalizedPower,
        float? intensityFactor,
        float? trainingStressScore,
        int? ftpUsed = null,
        float? best20MinPower = null,
        float? best5MinPower = null,
        float? best60MinPower = null,
        int? estimatedFtpFromActivity = null)
    {
        MaxPower = maxPower;
        NormalizedPower = normalizedPower;
        IntensityFactor = intensityFactor;
        TrainingStressScore = trainingStressScore;
        FtpUsed = ftpUsed;
        Best20MinPower = best20MinPower;
        Best5MinPower = best5MinPower;
        Best60MinPower = best60MinPower;
        EstimatedFtpFromActivity = estimatedFtpFromActivity;
    }
}
