using CyclingForge.Modules.Garmin.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Exceptions;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Commands.AuthorizeGarmin;

internal sealed class AuthorizeGarminCommandHandler : IRequestHandler<AuthorizeGarminCommand>
{
    private readonly IGarminApiService _garminApiService;
    private readonly IGarminTokenRepository _tokenRepository;
    private readonly IClock _clock;

    public AuthorizeGarminCommandHandler(
        IGarminApiService garminApiService,
        IGarminTokenRepository tokenRepository,
        IClock clock)
    {
        _garminApiService = garminApiService;
        _tokenRepository = tokenRepository;
        _clock = clock;
    }

    public async Task Handle(AuthorizeGarminCommand request, CancellationToken cancellationToken)
    {
        var existingToken = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken)
            ?? throw new GarminAuthorizationException("No pending authorization found. Please initiate the connection again.");

        var accessTokenResult = await _garminApiService.ExchangeForAccessTokenAsync(
            request.OAuthToken,
            existingToken.TokenSecret,
            request.OAuthVerifier,
            cancellationToken);

        var now = _clock.CurrentDate();
        existingToken.UpdateTokens(
            new AccessToken(accessTokenResult.AccessToken),
            accessTokenResult.AccessTokenSecret,
            now);

        await _tokenRepository.UpdateAsync(existingToken, cancellationToken);
    }
}
