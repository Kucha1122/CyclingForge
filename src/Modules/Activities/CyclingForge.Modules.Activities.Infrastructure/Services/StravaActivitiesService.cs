using CyclingForge.Modules.Activities.Application.Commands.SyncActivities;
using CyclingForge.Modules.Strava.Application.Contracts;
using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Shared.Abstractions.Exceptions;

namespace CyclingForge.Modules.Activities.Infrastructure.Services;

internal sealed class StravaActivitiesService : IStravaActivitiesService
{
    private readonly IStravaModuleApi _stravaModuleApi;
    private readonly IStravaApiService _stravaApiService;

    public StravaActivitiesService(
        IStravaModuleApi stravaModuleApi,
        IStravaApiService stravaApiService)
    {
        _stravaModuleApi = stravaModuleApi;
        _stravaApiService = stravaApiService;
    }

    public async Task<IReadOnlyList<StravaActivityDto>> FetchActivitiesAsync(
        Guid userId, CancellationToken cancellationToken = default)
    {
        var accessToken = await _stravaModuleApi.GetAccessTokenAsync(userId, cancellationToken)
            ?? throw new NotFoundException("StravaToken", userId);

        var activities = await _stravaApiService.GetActivitiesAsync(accessToken, cancellationToken: cancellationToken);

        return activities.Select(a => new StravaActivityDto(
            a.StravaId, a.Name, a.Type, a.StartDate, a.Distance,
            a.MovingTime, a.ElapsedTime, a.TotalElevationGain,
            a.AverageSpeed, a.MaxSpeed, a.AverageHeartRate,
            a.MaxHeartRate, a.AveragePower)).ToList();
    }
}
