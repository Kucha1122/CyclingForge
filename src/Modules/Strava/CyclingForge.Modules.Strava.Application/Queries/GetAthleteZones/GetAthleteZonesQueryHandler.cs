using System.Text.Json;
using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Queries.GetAthleteZones;

internal sealed class GetAthleteZonesQueryHandler : IRequestHandler<GetAthleteZonesQuery, AthleteZonesDto?>
{
    private readonly IStravaTokenRepository _tokenRepository;
    private readonly IStravaAthleteZonesRepository _zonesRepository;
    private readonly IStravaApiService _stravaApiService;
    private readonly IClock _clock;

    public GetAthleteZonesQueryHandler(
        IStravaTokenRepository tokenRepository,
        IStravaApiService stravaApiService,
        IStravaAthleteZonesRepository zonesRepository,
        IClock clock)
    {
        _tokenRepository = tokenRepository;
        _stravaApiService = stravaApiService;
        _zonesRepository = zonesRepository;
        _clock = clock;
    }

    public async Task<AthleteZonesDto?> Handle(GetAthleteZonesQuery request, CancellationToken cancellationToken)
    {
        var token = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        if (token is null)
            return null;

        var now = _clock.CurrentDate();
        if (token.IsExpired(now))
        {
            var refreshResponse = await _stravaApiService.RefreshTokenAsync(token.RefreshToken, cancellationToken);

            token.UpdateTokens(
                new AccessToken(refreshResponse.AccessToken),
                refreshResponse.RefreshToken,
                refreshResponse.ExpiresAt,
                now);

            await _tokenRepository.UpdateAsync(token, cancellationToken);
        }

        var zones = await _stravaApiService.GetZonesAsync(token.Token.Value, cancellationToken);
        if (zones is null)
            return null;

        var hrZones = zones.HeartRateZones
            .Select(z => new ZoneRangeDto(z.Min, z.Max))
            .ToArray();

        var powerZones = zones.PowerZones
            .Select(z => new ZoneRangeDto(z.Min, z.Max))
            .ToArray();

        // Persist zones snapshot for the user (for future reuse, e.g. activity zones)
        var hrJson = hrZones.Length > 0 ? JsonSerializer.Serialize(hrZones) : null;
        var powerJson = powerZones.Length > 0 ? JsonSerializer.Serialize(powerZones) : null;

        var existing = await _zonesRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        if (existing is null)
        {
            var aggregate = StravaAthleteZones.Create(
                request.UserId,
                token.AthleteId,
                hrJson,
                powerJson,
                now);
            await _zonesRepository.AddAsync(aggregate, cancellationToken);
        }
        else
        {
            existing.Update(hrJson, powerJson, now);
            await _zonesRepository.UpdateAsync(existing, cancellationToken);
        }

        if (hrZones.Length == 0 && powerZones.Length == 0)
        {
            return null;
        }

        return new AthleteZonesDto(hrZones, powerZones);
    }
}

