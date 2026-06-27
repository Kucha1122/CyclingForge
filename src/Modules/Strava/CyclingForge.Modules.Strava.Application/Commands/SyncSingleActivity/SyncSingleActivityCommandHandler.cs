using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Commands.SyncSingleActivity;

internal sealed class SyncSingleActivityCommandHandler : IRequestHandler<SyncSingleActivityCommand, Guid?>
{
    private static readonly string[] StreamKeys =
    {
        "time", "distance", "heartrate", "watts", "velocity_smooth",
        "altitude", "cadence", "temp", "moving", "grade_smooth"
    };

    private readonly IStravaTokenRepository _tokenRepository;
    private readonly IStravaActivityRepository _activityRepository;
    private readonly IStravaAthleteRepository _athleteRepository;
    private readonly IActivitySyncFilterRepository _filterRepository;
    private readonly IStravaApiService _stravaApiService;
    private readonly IClock _clock;

    public SyncSingleActivityCommandHandler(
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

    public async Task<Guid?> Handle(SyncSingleActivityCommand command, CancellationToken cancellationToken)
    {
        var athlete = await _athleteRepository.GetByStravaIdAsync(command.StravaAthleteId, cancellationToken);
        if (athlete is null)
        {
            return null;
        }

        if (string.Equals(command.AspectType, "delete", StringComparison.OrdinalIgnoreCase))
        {
            await _activityRepository.DeleteByExternalIdAsync(command.ActivityId, cancellationToken);
            return null;
        }

        var token = await _tokenRepository.GetByUserIdAsync(athlete.UserId, cancellationToken);
        if (token is null)
        {
            return null;
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

        var activityDto = await _stravaApiService.GetActivityByIdAsync(token.Token.Value, command.ActivityId, cancellationToken);
        if (activityDto is null)
        {
            return null;
        }

        var filters = await _filterRepository.GetByUserIdAsync(athlete.UserId, cancellationToken);
        if (filters.Any(f => f.Matches(activityDto.Type, activityDto.DeviceName)))
        {
            return null;
        }

        var existing = await _activityRepository.GetByExternalIdAsync(activityDto.StravaId, cancellationToken);
        if (existing is not null)
        {
            if (activityDto.DeviceWatts.HasValue)
            {
                existing.UpdateDeviceWatts(activityDto.DeviceWatts);
            }
            existing.UpdateSpeed(activityDto.AverageSpeed, activityDto.MaxSpeed);

            if (string.IsNullOrEmpty(existing.StreamsJson)
                && (activityDto.AveragePower.HasValue || activityDto.DeviceWatts == true))
            {
                var backfillStreams = await _stravaApiService.GetActivityStreamsJsonAsync(
                    token.Token.Value, activityDto.StravaId, StreamKeys, cancellationToken);
                if (!string.IsNullOrEmpty(backfillStreams))
                {
                    existing.UpdateStreams(backfillStreams);
                }
            }

            await _activityRepository.UpdateAsync(existing, cancellationToken);
            return athlete.UserId;
        }

        var streamsJson = await _stravaApiService.GetActivityStreamsJsonAsync(
            token.Token.Value, activityDto.StravaId, StreamKeys, cancellationToken);

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
        return athlete.UserId;
    }
}
