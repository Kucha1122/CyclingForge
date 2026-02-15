namespace CyclingForge.Modules.Activities.Application.Queries.GetActivityDetails;

public sealed record ActivityDetailsDto(
    Guid Id,
    long StravaActivityId,
    string Name,
    string Type,
    DateTime StartDate,
    float DistanceKm,
    float DistanceMeters,
    TimeSpan MovingTime,
    TimeSpan ElapsedTime,
    float TotalElevationGain,
    float? AverageSpeed,
    float? MaxSpeed,
    float? AverageHeartRate,
    float? MaxHeartRate,
    float? AveragePower,
    DateTime SyncedAt);
