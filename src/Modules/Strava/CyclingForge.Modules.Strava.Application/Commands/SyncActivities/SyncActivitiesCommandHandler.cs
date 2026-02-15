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
    private readonly IStravaApiService _stravaApiService;
    private readonly IClock _clock;

    public SyncActivitiesCommandHandler(
        IStravaTokenRepository tokenRepository,
        IStravaActivityRepository activityRepository,
        IStravaAthleteRepository athleteRepository,
        IStravaApiService stravaApiService,
        IClock clock)
    {
        _tokenRepository = tokenRepository;
        _activityRepository = activityRepository;
        _athleteRepository = athleteRepository;
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

        var activities = await _stravaApiService.GetActivitiesAsync(token.Token.Value, 1, 30, cancellationToken);

        foreach (var activityDto in activities)
        {
            if (await _activityRepository.ExistsAsync(activityDto.StravaId, cancellationToken))
            {
                continue;
            }

            var streamKeys = new[] { 
                "time", "distance", "heartrate", "watts", "velocity_smooth", 
                "altitude", "cadence", "temp", "moving", "grade_smooth" 
            };
            
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
                streamsJson);
            
            await _activityRepository.AddAsync(activity, cancellationToken);
        }
    }
}
