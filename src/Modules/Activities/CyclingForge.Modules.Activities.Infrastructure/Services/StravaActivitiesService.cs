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
        Guid userId, DateTime? afterUtc = null, DateTime? beforeUtc = null, CancellationToken cancellationToken = default)
    {
        var fromDb = await _stravaModuleApi.GetActivitiesWithStreamsForUserAsync(userId, afterUtc, beforeUtc, cancellationToken);
        if (fromDb is { Count: > 0 })
        {
            // Strava DB may contain speed in m/s (legacy) or km/h; normalize to km/h for Activities.
            const float MetersPerSecondToKmh = 3.6f;
            const float MaxReasonableMs = 30f; // 30 m/s = 108 km/h; above that assume already km/h
            return fromDb.Select(a => new StravaActivityDto(
                a.StravaId, a.Name, a.Type, a.StartDate, a.Distance,
                a.MovingTime, a.ElapsedTime, a.TotalElevationGain,
                ToKmh(a.AverageSpeed),
                ToKmh(a.MaxSpeed),
                a.AverageHeartRate,
                a.MaxHeartRate, a.AveragePower, a.DeviceWatts, a.StreamsJson)).ToList();

            static float? ToKmh(float? speed)
            {
                if (!speed.HasValue) return null;
                var v = speed.Value;
                if (v > MaxReasonableMs) return v; // already km/h
                return v * MetersPerSecondToKmh;
            }
        }

        var accessToken = await _stravaModuleApi.GetAccessTokenAsync(userId, cancellationToken)
            ?? throw new NotFoundException("StravaToken", userId);

        const int perPage = 200;
        var page = 1;
        var allActivities = new List<StravaActivityDto>();
        while (true)
        {
            var pageActivities = await _stravaApiService.GetActivitiesAsync(
                accessToken, page, perPage, after: null, before: null, cancellationToken);
            if (pageActivities is null || pageActivities.Count == 0)
                break;
            foreach (var a in pageActivities)
                allActivities.Add(new StravaActivityDto(
                    a.StravaId, a.Name, a.Type, a.StartDate, a.Distance,
                    a.MovingTime, a.ElapsedTime, a.TotalElevationGain,
                    a.AverageSpeed, a.MaxSpeed, a.AverageHeartRate,
                    a.MaxHeartRate, a.AveragePower, a.DeviceWatts, StreamsJson: null));
            if (pageActivities.Count < perPage)
                break;
            page++;
        }

        return allActivities;
    }
}
