using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Strava.Application.Queries.GetActivities;

public sealed record GetActivitiesQuery(Guid UserId, int Page, int PerPage) : IQuery<IEnumerable<ActivityDto>>;

public sealed record ActivityDto(
    long ExternalId,
    string Name,
    string Type,
    DateTime StartDate,
    float Distance,
    int MovingTime,
    float TotalElevationGain,
    float? AveragePower,
    float? AverageHeartRate);
