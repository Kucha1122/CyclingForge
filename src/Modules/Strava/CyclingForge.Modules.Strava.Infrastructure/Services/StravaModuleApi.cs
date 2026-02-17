using CyclingForge.Modules.Strava.Application.Contracts;
using CyclingForge.Modules.Strava.Application.Commands.RefreshToken;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Infrastructure.Services;

internal sealed class StravaModuleApi : IStravaModuleApi
{
    private readonly IStravaTokenRepository _tokenRepository;
    private readonly IStravaAthleteRepository _athleteRepository;
    private readonly IStravaActivityRepository _activityRepository;
    private readonly IMediator _mediator;
    private readonly IClock _clock;

    public StravaModuleApi(
        IStravaTokenRepository tokenRepository,
        IStravaAthleteRepository athleteRepository,
        IStravaActivityRepository activityRepository,
        IMediator mediator,
        IClock clock)
    {
        _tokenRepository = tokenRepository;
        _athleteRepository = athleteRepository;
        _activityRepository = activityRepository;
        _mediator = mediator;
        _clock = clock;
    }

    public async Task<string?> GetAccessTokenAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var token = await _tokenRepository.GetByUserIdAsync(userId, cancellationToken);
        if (token is null)
            return null;

        if (token.IsExpired(_clock.CurrentDate()))
        {
            await _mediator.Send(new RefreshStravaTokenCommand(userId), cancellationToken);
            token = await _tokenRepository.GetByUserIdAsync(userId, cancellationToken);
        }

        return token?.Token.Value;
    }

    public async Task<bool> IsConnectedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var token = await _tokenRepository.GetByUserIdAsync(userId, cancellationToken);
        return token is not null;
    }

    public async Task<IReadOnlyList<StravaActivityWithStreamsDto>?> GetActivitiesWithStreamsForUserAsync(Guid userId, DateTime? afterUtc = null, DateTime? beforeUtc = null, CancellationToken cancellationToken = default)
    {
        var athlete = await _athleteRepository.GetByUserIdAsync(userId, cancellationToken);
        if (athlete is null)
            return null;

        var activities = afterUtc.HasValue && beforeUtc.HasValue
            ? await _activityRepository.GetByAthleteIdAndDateRangeAsync(athlete.Id, afterUtc.Value, beforeUtc.Value, cancellationToken)
            : await _activityRepository.GetByAthleteIdAsync(athlete.Id, 1, 10000, cancellationToken);
        return activities
            .Select(a => new StravaActivityWithStreamsDto(
                a.ExternalId,
                a.Name,
                a.Type,
                a.StartDate,
                a.Distance,
                a.MovingTime,
                a.ElapsedTime,
                a.TotalElevationGain,
                a.AverageSpeed,
                a.MaxSpeed,
                a.AverageHeartRate,
                a.MaxHeartRate,
                a.AveragePower,
                a.DeviceWatts,
                a.StreamsJson))
            .ToList();
    }
}
