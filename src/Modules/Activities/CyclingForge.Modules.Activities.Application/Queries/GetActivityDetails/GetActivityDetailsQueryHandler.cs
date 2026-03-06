using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Activities.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Exceptions;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetActivityDetails;

internal sealed class GetActivityDetailsQueryHandler : IRequestHandler<GetActivityDetailsQuery, ActivityDetailsDto>
{
    private readonly IActivityRepository _activityRepository;

    public GetActivityDetailsQueryHandler(IActivityRepository activityRepository)
    {
        _activityRepository = activityRepository;
    }

    public async Task<ActivityDetailsDto> Handle(GetActivityDetailsQuery request, CancellationToken cancellationToken)
    {
        var activity = await _activityRepository
            .GetByIdAsync(new ActivityId(request.ActivityId), cancellationToken)
            ?? throw new NotFoundException("Activity", request.ActivityId);

        return new ActivityDetailsDto(
            activity.Id.Value,
            activity.StravaActivityId,
            activity.Name,
            activity.Type.Value,
            activity.StartDate,
            activity.Distance.ToKilometers(),
            activity.Distance.Meters,
            activity.MovingTime.ToTimeSpan(),
            activity.ElapsedTime.ToTimeSpan(),
            activity.TotalElevationGain,
            activity.AverageSpeed,
            activity.MaxSpeed,
            activity.AverageHeartRate,
            activity.MaxHeartRate,
            activity.AveragePower,
            activity.MaxPower,
            activity.NormalizedPower,
            activity.IntensityFactor,
            activity.TrainingStressScore,
            activity.FtpUsed,
            activity.Best5MinPower,
            activity.Best20MinPower,
            activity.Best60MinPower,
            activity.EstimatedFtpFromActivity,
            activity.DeviceWatts,
            activity.SyncedAt);
    }
}
