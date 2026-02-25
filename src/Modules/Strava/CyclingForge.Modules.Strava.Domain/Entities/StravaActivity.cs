using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Strava.Domain.Entities;

public sealed class StravaActivity : AggregateRoot<Guid>
{
    public long ExternalId { get; private set; }
    public Guid AthleteId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Type { get; private set; } = string.Empty;
    public DateTime StartDate { get; private set; }
    public float Distance { get; private set; }
    public int MovingTime { get; private set; }
    public int ElapsedTime { get; private set; }
    public float TotalElevationGain { get; private set; }
    public float? AverageSpeed { get; private set; }
    public float? MaxSpeed { get; private set; }
    public float? AverageHeartRate { get; private set; }
    public float? MaxHeartRate { get; private set; }
    public float? AveragePower { get; private set; }
    /// <summary>True = power from real meter (Strava device_watts); false = estimated; null = unknown/not set.</summary>
    public bool? DeviceWatts { get; private set; }
    public string? StreamsJson { get; private set; }

    private StravaActivity() { }

    public static StravaActivity Create(
        long externalId,
        Guid athleteId,
        string name,
        string type,
        DateTime startDate,
        float distance,
        int movingTime,
        int elapsedTime,
        float totalElevationGain,
        float? averageSpeed,
        float? maxSpeed,
        float? averageHeartRate,
        float? maxHeartRate,
        float? averagePower,
        bool? deviceWatts,
        string? streamsJson)
    {
        return new StravaActivity
        {
            Id = Guid.NewGuid(),
            ExternalId = externalId,
            AthleteId = athleteId,
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
            StreamsJson = streamsJson
        };
    }

    public void UpdateDeviceWatts(bool? deviceWatts)
    {
        DeviceWatts = deviceWatts;
    }

    public void UpdateSpeed(float? averageSpeed, float? maxSpeed)
    {
        AverageSpeed = averageSpeed;
        MaxSpeed = maxSpeed;
    }

    public void UpdateStreams(string streamsJson)
    {
        StreamsJson = streamsJson;
    }
}
