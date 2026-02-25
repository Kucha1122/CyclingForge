namespace CyclingForge.Modules.Activities.Application.Queries.GetActivities;

public sealed record ActivityDto(
    Guid Id,
    long ExternalId,
    string Name,
    string Type,
    DateTime StartDate,
    float Distance,
    int MovingTime,
    int ElapsedTime,
    float TotalElevationGain,
    float? AverageSpeed,
    float? MaxSpeed,
    float? AverageHeartRate,
    float? MaxHeartRate,
    float? AveragePower,
    float? MaxPower,
    float? NormalizedPower,
    float? IntensityFactor,
    float? TrainingStressScore,
    int? FtpUsed,
    bool? DeviceWatts);
