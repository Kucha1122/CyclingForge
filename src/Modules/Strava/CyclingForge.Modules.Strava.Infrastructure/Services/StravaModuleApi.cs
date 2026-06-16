using System.Text.Json;
using CyclingForge.Modules.Strava.Application.Contracts;
using CyclingForge.Modules.Strava.Application.Commands.RefreshToken;
using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Infrastructure.Services;

internal sealed class StravaModuleApi : IStravaModuleApi
{
    private readonly IStravaTokenRepository _tokenRepository;
    private readonly IStravaAthleteRepository _athleteRepository;
    private readonly IStravaActivityRepository _activityRepository;
    private readonly IStravaAthleteZonesRepository _zonesRepository;
    private readonly IMediator _mediator;
    private readonly IClock _clock;

    public StravaModuleApi(
        IStravaTokenRepository tokenRepository,
        IStravaAthleteRepository athleteRepository,
        IStravaActivityRepository activityRepository,
        IStravaAthleteZonesRepository zonesRepository,
        IMediator mediator,
        IClock clock)
    {
        _tokenRepository = tokenRepository;
        _athleteRepository = athleteRepository;
        _activityRepository = activityRepository;
        _zonesRepository = zonesRepository;
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

    public async Task<IReadOnlyList<ActivityHrZonesDto>?> GetHrTimeInZonesForUserAsync(Guid userId, DateTime afterUtc, DateTime beforeUtc, CancellationToken cancellationToken = default)
    {
        var athlete = await _athleteRepository.GetByUserIdAsync(userId, cancellationToken);
        if (athlete is null)
            return null;

        var zones = ParseHrZones(await _zonesRepository.GetByUserIdAsync(userId, cancellationToken));

        var activities = await _activityRepository.GetByAthleteIdAndDateRangeAsync(
            athlete.Id, afterUtc, beforeUtc, cancellationToken);

        return activities
            .Select(a => new ActivityHrZonesDto(
                a.ExternalId,
                zones.Count == 0 ? Array.Empty<int>() : HrTimeInZoneCalculator.Compute(a.StreamsJson, zones)))
            .ToList();
    }

    private static IReadOnlyList<HrTimeInZoneCalculator.HrZone> ParseHrZones(Domain.Entities.StravaAthleteZones? zones)
    {
        if (zones?.HeartRateZonesJson is not { } json || string.IsNullOrWhiteSpace(json))
            return Array.Empty<HrTimeInZoneCalculator.HrZone>();

        try
        {
            var ranges = JsonSerializer.Deserialize<List<ZoneRange>>(json);
            return ranges is null
                ? Array.Empty<HrTimeInZoneCalculator.HrZone>()
                : ranges.Select(r => new HrTimeInZoneCalculator.HrZone(r.Min, r.Max)).ToList();
        }
        catch (JsonException)
        {
            return Array.Empty<HrTimeInZoneCalculator.HrZone>();
        }
    }

    private sealed record ZoneRange(int Min, int Max);
}
