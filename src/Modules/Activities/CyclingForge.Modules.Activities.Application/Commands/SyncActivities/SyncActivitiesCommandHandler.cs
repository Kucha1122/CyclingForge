using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Activities.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Commands.SyncActivities;

internal sealed class SyncActivitiesCommandHandler : IRequestHandler<SyncActivitiesCommand, int>
{
    private readonly IActivityRepository _activityRepository;
    private readonly IStravaActivitiesService _stravaService;
    private readonly IClock _clock;

    public SyncActivitiesCommandHandler(
        IActivityRepository activityRepository,
        IStravaActivitiesService stravaService,
        IClock clock)
    {
        _activityRepository = activityRepository;
        _stravaService = stravaService;
        _clock = clock;
    }

    public async Task<int> Handle(SyncActivitiesCommand request, CancellationToken cancellationToken)
    {
        var stravaActivities = await _stravaService.FetchActivitiesAsync(request.UserId, cancellationToken);
        var syncedCount = 0;
        var now = _clock.CurrentDate();

        foreach (var stravaActivity in stravaActivities)
        {
            var existingActivity = await _activityRepository
                .GetByStravaIdAsync(stravaActivity.StravaId, request.UserId, cancellationToken);

            if (existingActivity is not null)
            {
                existingActivity.Update(
                    stravaActivity.Name,
                    new Distance(stravaActivity.Distance),
                    new Duration(stravaActivity.MovingTime),
                    new Duration(stravaActivity.ElapsedTime),
                    stravaActivity.TotalElevationGain,
                    stravaActivity.AverageSpeed,
                    stravaActivity.MaxSpeed,
                    stravaActivity.AverageHeartRate,
                    stravaActivity.MaxHeartRate,
                    stravaActivity.AveragePower,
                    now);

                await _activityRepository.UpdateAsync(existingActivity, cancellationToken);
            }
            else
            {
                var activity = Activity.Create(
                    request.UserId,
                    stravaActivity.StravaId,
                    stravaActivity.Name,
                    ActivityType.FromString(stravaActivity.Type),
                    stravaActivity.StartDate,
                    new Distance(stravaActivity.Distance),
                    new Duration(stravaActivity.MovingTime),
                    new Duration(stravaActivity.ElapsedTime),
                    stravaActivity.TotalElevationGain,
                    stravaActivity.AverageSpeed,
                    stravaActivity.MaxSpeed,
                    stravaActivity.AverageHeartRate,
                    stravaActivity.MaxHeartRate,
                    stravaActivity.AveragePower,
                    now);

                await _activityRepository.AddAsync(activity, cancellationToken);
                syncedCount++;
            }
        }

        return syncedCount;
    }
}

public interface IStravaActivitiesService
{
    Task<IReadOnlyList<StravaActivityDto>> FetchActivitiesAsync(Guid userId, CancellationToken cancellationToken = default);
}

public sealed record StravaActivityDto(
    long StravaId,
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
    float? AveragePower);
