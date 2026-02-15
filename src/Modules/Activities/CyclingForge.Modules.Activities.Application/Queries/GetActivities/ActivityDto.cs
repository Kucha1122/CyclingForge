namespace CyclingForge.Modules.Activities.Application.Queries.GetActivities;

public sealed record ActivityDto(
    Guid Id,
    long StravaActivityId,
    string Name,
    string Type,
    DateTime StartDate,
    float DistanceKm,
    TimeSpan MovingTime,
    float ElevationGain,
    float? AverageSpeed,
    float? MaxSpeed);
