using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Commands.Authorize;

internal sealed class AuthorizeStravaCommandHandler : IRequestHandler<AuthorizeStravaCommand>
{
    private readonly IStravaApiService _stravaApiService;
    private readonly IStravaTokenRepository _tokenRepository;
    private readonly IStravaAthleteRepository _athleteRepository;
    private readonly IClock _clock;

    public AuthorizeStravaCommandHandler(
        IStravaApiService stravaApiService,
        IStravaTokenRepository tokenRepository,
        IStravaAthleteRepository athleteRepository,
        IClock clock)
    {
        _stravaApiService = stravaApiService;
        _tokenRepository = tokenRepository;
        _athleteRepository = athleteRepository;
        _clock = clock;
    }

    public async Task Handle(AuthorizeStravaCommand request, CancellationToken cancellationToken)
    {
        var tokenResponse = await _stravaApiService.ExchangeAuthorizationCodeAsync(request.AuthorizationCode, cancellationToken);
        var now = _clock.CurrentDate();

        var existingToken = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken);

        if (existingToken is not null)
        {
            existingToken.UpdateTokens(
                new AccessToken(tokenResponse.AccessToken),
                tokenResponse.RefreshToken,
                tokenResponse.ExpiresAt,
                now);

            await _tokenRepository.UpdateAsync(existingToken, cancellationToken);
        }
        else
        {
            var token = StravaToken.Create(
                request.UserId,
                new StravaAthleteId(tokenResponse.AthleteId),
                new AccessToken(tokenResponse.AccessToken),
                tokenResponse.RefreshToken,
                tokenResponse.ExpiresAt,
                now);

            await _tokenRepository.AddAsync(token, cancellationToken);
        }

        var existingAthlete = await _athleteRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        if (existingAthlete is null)
        {
            var athlete = StravaAthlete.Create(
                request.UserId,
                new StravaAthleteId(tokenResponse.AthleteId),
                tokenResponse.AthleteFirstName,
                tokenResponse.AthleteLastName,
                tokenResponse.AthleteProfileImageUrl,
                null,
                null,
                now);

            await _athleteRepository.AddAsync(athlete, cancellationToken);
        }
    }
}
