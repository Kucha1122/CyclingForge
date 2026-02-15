using CyclingForge.Modules.Strava.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Queries.GetActivityDetails;

internal sealed class GetActivityDetailsQueryHandler : IRequestHandler<GetActivityDetailsQuery, ActivityDetailsDto?>
{
    private readonly IStravaActivityRepository _activityRepository;

    public GetActivityDetailsQueryHandler(IStravaActivityRepository activityRepository)
    {
        _activityRepository = activityRepository;
    }

    public async Task<ActivityDetailsDto?> Handle(GetActivityDetailsQuery query, CancellationToken cancellationToken)
    {
        var activity = await _activityRepository.GetByExternalIdAsync(query.ExternalId, cancellationToken);
        if (activity is null)
        {
            return null;
        }

        return new ActivityDetailsDto(
            activity.ExternalId,
            activity.Name,
            activity.Type,
            activity.StartDate,
            activity.Distance,
            activity.MovingTime,
            activity.ElapsedTime,
            activity.TotalElevationGain,
            activity.AverageSpeed,
            activity.MaxSpeed,
            activity.AverageHeartRate,
            activity.MaxHeartRate,
            activity.AveragePower,
            activity.StreamsJson);
    }
}
