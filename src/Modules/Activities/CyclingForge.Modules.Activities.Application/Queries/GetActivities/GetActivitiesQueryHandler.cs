using CyclingForge.Modules.Activities.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetActivities;

internal sealed class GetActivitiesQueryHandler : IRequestHandler<GetActivitiesQuery, IReadOnlyList<ActivityDto>>
{
    private readonly IActivityRepository _activityRepository;

    public GetActivitiesQueryHandler(IActivityRepository activityRepository)
    {
        _activityRepository = activityRepository;
    }

    public async Task<IReadOnlyList<ActivityDto>> Handle(GetActivitiesQuery request, CancellationToken cancellationToken)
    {
        var activities = await _activityRepository
            .GetByUserIdAsync(request.UserId, request.Page, request.PageSize, cancellationToken);

        return activities.Select(a => new ActivityDto(
            a.Id.Value,
            a.StravaActivityId,
            a.Name,
            a.Type.Value,
            a.StartDate,
            a.Distance.ToKilometers(),
            a.MovingTime.ToTimeSpan(),
            a.TotalElevationGain,
            a.AverageSpeed,
            a.MaxSpeed,
            a.AveragePower,
            a.MaxPower,
            a.NormalizedPower,
            a.IntensityFactor,
            a.TrainingStressScore)).ToList();
    }
}
