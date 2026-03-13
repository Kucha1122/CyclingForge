using CyclingForge.Modules.Garmin.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Queries.InitiateAuth;

internal sealed class InitiateGarminAuthQueryHandler : IRequestHandler<InitiateGarminAuthQuery, GarminAuthUrlDto>
{
    private readonly IGarminApiService _garminApiService;
    private readonly IGarminTokenRepository _tokenRepository;
    private readonly IClock _clock;

    public InitiateGarminAuthQueryHandler(
        IGarminApiService garminApiService,
        IGarminTokenRepository tokenRepository,
        IClock clock)
    {
        _garminApiService = garminApiService;
        _tokenRepository = tokenRepository;
        _clock = clock;
    }

    public async Task<GarminAuthUrlDto> Handle(InitiateGarminAuthQuery request, CancellationToken cancellationToken)
    {
        var requestToken = await _garminApiService.GetRequestTokenAsync(cancellationToken);
        var now = _clock.CurrentDate();

        var existing = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        if (existing is not null)
        {
            existing.UpdateTokens(
                new AccessToken(requestToken.OAuthToken),
                requestToken.OAuthTokenSecret,
                now);
            await _tokenRepository.UpdateAsync(existing, cancellationToken);
        }
        else
        {
            var token = GarminToken.Create(
                request.UserId,
                new AccessToken(requestToken.OAuthToken),
                requestToken.OAuthTokenSecret,
                now);
            await _tokenRepository.AddAsync(token, cancellationToken);
        }

        var authorizeUrl = _garminApiService.GetAuthorizeUrl(requestToken.OAuthToken);
        return new GarminAuthUrlDto(authorizeUrl);
    }
}
