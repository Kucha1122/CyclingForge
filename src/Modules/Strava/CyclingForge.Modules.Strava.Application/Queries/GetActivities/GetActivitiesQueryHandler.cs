using CyclingForge.Modules.Strava.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Queries.GetActivities;

internal sealed class GetActivitiesQueryHandler : IRequestHandler<GetActivitiesQuery, IEnumerable<ActivityDto>>
{
    private readonly IStravaActivityRepository _activityRepository;
    private readonly IStravaAthleteRepository _athleteRepository;

    public GetActivitiesQueryHandler(
        IStravaActivityRepository activityRepository,
        IStravaAthleteRepository athleteRepository)
    {
        _activityRepository = activityRepository;
        _athleteRepository = athleteRepository;
    }

    public async Task<IEnumerable<ActivityDto>> Handle(GetActivitiesQuery query, CancellationToken cancellationToken)
    {
        var athlete = await _athleteRepository.GetByUserIdAsync(query.UserId, cancellationToken);
        if (athlete is null)
        {
            return Enumerable.Empty<ActivityDto>();
        }
        var activities = await _activityRepository.GetByAthleteIdAsync(athlete.Id, query.Page, query.PerPage, cancellationToken);
        return activities.Select(a => new ActivityDto(
            a.ExternalId,
            a.Name,
            a.Type,
            a.StartDate,
            a.Distance,
            a.MovingTime,
            a.TotalElevationGain,
            a.AveragePower,
            a.AverageHeartRate));
    }
}
