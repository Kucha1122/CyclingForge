using CyclingForge.Modules.Strava.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Queries.GetActivityCounts;

internal sealed class GetActivityCountsQueryHandler : IRequestHandler<GetActivityCountsQuery, ActivityCountsDto?>
{
    private readonly IStravaActivityRepository _activityRepository;
    private readonly IStravaAthleteRepository _athleteRepository;

    public GetActivityCountsQueryHandler(
        IStravaActivityRepository activityRepository,
        IStravaAthleteRepository athleteRepository)
    {
        _activityRepository = activityRepository;
        _athleteRepository = athleteRepository;
    }

    public async Task<ActivityCountsDto?> Handle(GetActivityCountsQuery query, CancellationToken cancellationToken)
    {
        var athlete = await _athleteRepository.GetByUserIdAsync(query.UserId, cancellationToken);
        if (athlete is null)
        {
            return null;
        }
        var (total, ride, run, walk) = await _activityRepository.GetCountsByAthleteIdAsync(athlete.Id, cancellationToken);
        return new ActivityCountsDto(total, ride, run, walk);
    }
}
