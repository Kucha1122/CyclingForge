using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Commands.SyncActivities;

internal sealed class SyncActivitiesCommandHandler : IRequestHandler<SyncActivitiesCommand>
{
    private readonly IStravaTokenRepository _tokenRepository;
    private readonly IStravaActivityRepository _activityRepository;
    private readonly IStravaAthleteRepository _athleteRepository;
    private readonly IActivitySyncFilterRepository _filterRepository;
    private readonly IStravaApiService _stravaApiService;
    private readonly IClock _clock;

    public SyncActivitiesCommandHandler(
        IStravaTokenRepository tokenRepository,
        IStravaActivityRepository activityRepository,
        IStravaAthleteRepository athleteRepository,
        IActivitySyncFilterRepository filterRepository,
        IStravaApiService stravaApiService,
        IClock clock)
    {
        _tokenRepository = tokenRepository;
        _activityRepository = activityRepository;
        _athleteRepository = athleteRepository;
        _filterRepository = filterRepository;
        _stravaApiService = stravaApiService;
        _clock = clock;
    }

    public async Task Handle(SyncActivitiesCommand command, CancellationToken cancellationToken)
    {
        var athlete = await _athleteRepository.GetByUserIdAsync(command.UserId, cancellationToken);
        if (athlete is null)
        {
            return;
        }

        var token = await _tokenRepository.GetByUserIdAsync(command.UserId, cancellationToken);
        if (token is null)
        {
            return;
        }

        if (token.ExpiresAt <= _clock.CurrentDate())
        {
            var refreshedToken = await _stravaApiService.RefreshTokenAsync(token.RefreshToken, cancellationToken);
            token.UpdateTokens(
                new Domain.ValueObjects.AccessToken(refreshedToken.AccessToken),
                refreshedToken.RefreshToken,
                refreshedToken.ExpiresAt,
                _clock.CurrentDate());
            
            await _tokenRepository.UpdateAsync(token, cancellationToken);
        }

        var latestStart = await _activityRepository.GetLatestActivityStartDateAsync(athlete.Id, cancellationToken);
        long? afterUnix = null;
        long? beforeUnix = null;

        if (command.ForceFullSync)
        {
            // Full sync: wszystko, bez ograniczeń
        }
        else
        {
            // Quick sync: ZAWSZE tylko te dni – nowsze niż ostatnia, nie później niż dziś
            // Brak aktywności → sync tylko z dzisiaj
            var todayStart = _clock.CurrentDate().Date;
            var todayEnd = todayStart.AddDays(1);
            // Cofamy okno o 1 dzień (overlap) względem ostatniej aktywności, żeby nie zgubić
            // wpisów dodanych z opóźnieniem; upsert po ExternalId chroni przed duplikatami.
            afterUnix = latestStart.HasValue
                ? new DateTimeOffset(latestStart.Value.AddDays(-1), TimeSpan.Zero).ToUnixTimeSeconds()
                : new DateTimeOffset(todayStart, TimeSpan.Zero).ToUnixTimeSeconds();
            beforeUnix = new DateTimeOffset(todayEnd, TimeSpan.Zero).ToUnixTimeSeconds();
        }

        var filters = await _filterRepository.GetByUserIdAsync(command.UserId, cancellationToken);

        const int perPage = 200;
        const int maxStreamBackfillsPerSync = 50;
        var page = 1;
        var streamBackfillCount = 0;
        var streamKeys = new[] {
            "time", "distance", "heartrate", "watts", "velocity_smooth",
            "altitude", "cadence", "temp", "moving", "grade_smooth"
        };

        while (true)
        {
            var activities = await _stravaApiService.GetActivitiesAsync(
                token.Token.Value, page, perPage, after: afterUnix, before: beforeUnix, cancellationToken);
            if (activities is null || activities.Count == 0)
            {
                break;
            }

            foreach (var activityDto in activities)
            {
                if (filters.Any(f => f.Matches(activityDto.Type, activityDto.DeviceName)))
                {
                    continue;
                }

                var existing = await _activityRepository.GetByExternalIdAsync(activityDto.StravaId, cancellationToken);
                if (existing is not null)
                {
                    if (activityDto.DeviceWatts.HasValue)
                    {
                        existing.UpdateDeviceWatts(activityDto.DeviceWatts);
                    }
                    // Refresh speed from API (already in km/h from StravaApiService conversion)
                    existing.UpdateSpeed(activityDto.AverageSpeed, activityDto.MaxSpeed);
                    // Backfill streams for activities that have power but no StreamsJson (so Activities module can compute Best5/20/60 and eFTP dots).
                    var needsStreams = streamBackfillCount < maxStreamBackfillsPerSync
                        && string.IsNullOrEmpty(existing.StreamsJson)
                        && (activityDto.AveragePower.HasValue || activityDto.DeviceWatts == true);
                    if (needsStreams)
                    {
                        var backfillStreams = await _stravaApiService.GetActivityStreamsJsonAsync(
                            token.Token.Value, activityDto.StravaId, streamKeys, cancellationToken);
                        if (!string.IsNullOrEmpty(backfillStreams))
                        {
                            existing.UpdateStreams(backfillStreams);
                            streamBackfillCount++;
                        }
                        await Task.Delay(100, cancellationToken);
                    }
                    await _activityRepository.UpdateAsync(existing, cancellationToken);
                    continue;
                }

                var streamsJson = await _stravaApiService.GetActivityStreamsJsonAsync(
                    token.Token.Value, activityDto.StravaId, streamKeys, cancellationToken);

                var activity = StravaActivity.Create(
                    activityDto.StravaId,
                    athlete.Id,
                    activityDto.Name,
                    activityDto.Type,
                    activityDto.StartDate,
                    activityDto.Distance,
                    activityDto.MovingTime,
                    activityDto.ElapsedTime,
                    activityDto.TotalElevationGain,
                    activityDto.AverageSpeed,
                    activityDto.MaxSpeed,
                    activityDto.AverageHeartRate,
                    activityDto.MaxHeartRate,
                    activityDto.AveragePower,
                    activityDto.DeviceWatts,
                    streamsJson);

                await _activityRepository.AddAsync(activity, cancellationToken);
            }

            if (activities.Count < perPage)
            {
                break;
            }

            page++;
            await Task.Delay(250, cancellationToken);
        }
    }
}
