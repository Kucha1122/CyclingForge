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
            // Strava DB stores speed in km/h (written by Strava sync via StravaApiService which converts m/s→km/h).
            // Return as-is; do NOT convert again or we get inflated values (e.g. 28 → 102.8).
            return fromDb.Select(a => new StravaActivityDto(
                a.StravaId, a.Name, a.Type, a.StartDate, a.Distance,
                a.MovingTime, a.ElapsedTime, a.TotalElevationGain,
                a.AverageSpeed,
                a.MaxSpeed,
                a.AverageHeartRate,
                a.MaxHeartRate, a.AveragePower, a.DeviceWatts, a.StreamsJson)).ToList();
        }

        var accessToken = await _stravaModuleApi.GetAccessTokenAsync(userId, cancellationToken)
            ?? throw new NotFoundException("StravaToken", userId);

        // Honor the requested date window so we don't pull the entire history when only
        // newer activities are needed (e.g. quick sync). Strava expects epoch seconds.
        long? afterEpoch = afterUtc.HasValue
            ? new DateTimeOffset(DateTime.SpecifyKind(afterUtc.Value, DateTimeKind.Utc)).ToUnixTimeSeconds()
            : null;
        long? beforeEpoch = beforeUtc.HasValue
            ? new DateTimeOffset(DateTime.SpecifyKind(beforeUtc.Value, DateTimeKind.Utc)).ToUnixTimeSeconds()
            : null;

        const int perPage = 200;
        var page = 1;
        var allActivities = new List<StravaActivityDto>();
        while (true)
        {
            var pageActivities = await _stravaApiService.GetActivitiesAsync(
                accessToken, page, perPage, after: afterEpoch, before: beforeEpoch, cancellationToken);
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

    public async Task<IReadOnlyList<HrZoneBreakdownDto>> GetHrTimeInZonesAsync(
        Guid userId, DateTime afterUtc, DateTime beforeUtc, CancellationToken cancellationToken = default)
    {
        var breakdowns = await _stravaModuleApi.GetHrTimeInZonesForUserAsync(userId, afterUtc, beforeUtc, cancellationToken);
        if (breakdowns is null)
            return Array.Empty<HrZoneBreakdownDto>();

        return breakdowns
            .Select(b => new HrZoneBreakdownDto(b.StravaId, b.SecondsPerZone))
            .ToList();
    }
}
