using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Strava.Application.Queries.GetActivityDetails;

public sealed record GetActivityDetailsQuery(long ExternalId) : IQuery<ActivityDetailsDto?>;

public sealed record ActivityDetailsDto(
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
    string? StreamsJson);
