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
            Id: a.Id.Value,
            ExternalId: a.StravaActivityId,
            Name: a.Name,
            Type: a.Type.Value,
            StartDate: a.StartDate,
            Distance: a.Distance.Meters,
            MovingTime: a.MovingTime.Seconds,
            ElapsedTime: a.ElapsedTime.Seconds,
            TotalElevationGain: a.TotalElevationGain,
            AverageSpeed: a.AverageSpeed,
            MaxSpeed: a.MaxSpeed,
            AverageHeartRate: a.AverageHeartRate,
            MaxHeartRate: a.MaxHeartRate,
            AveragePower: a.AveragePower,
            MaxPower: a.MaxPower,
            NormalizedPower: a.NormalizedPower,
            IntensityFactor: a.IntensityFactor,
            TrainingStressScore: a.TrainingStressScore,
            FtpUsed: a.FtpUsed,
            DeviceWatts: a.DeviceWatts)).ToList();
    }
}
