using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Exceptions;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Commands.RefreshToken;

internal sealed class RefreshStravaTokenCommandHandler : IRequestHandler<RefreshStravaTokenCommand>
{
    private readonly IStravaApiService _stravaApiService;
    private readonly IStravaTokenRepository _tokenRepository;
    private readonly IClock _clock;

    public RefreshStravaTokenCommandHandler(
        IStravaApiService stravaApiService,
        IStravaTokenRepository tokenRepository,
        IClock clock)
    {
        _stravaApiService = stravaApiService;
        _tokenRepository = tokenRepository;
        _clock = clock;
    }

    public async Task Handle(RefreshStravaTokenCommand request, CancellationToken cancellationToken)
    {
        var token = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken)
            ?? throw new StravaAuthorizationException("No Strava token found for user.");

        var now = _clock.CurrentDate();

        if (!token.IsExpired(now))
            return;

        var refreshResponse = await _stravaApiService.RefreshTokenAsync(token.RefreshToken, cancellationToken);

        token.UpdateTokens(
            new AccessToken(refreshResponse.AccessToken),
            refreshResponse.RefreshToken,
            refreshResponse.ExpiresAt,
            now);

        await _tokenRepository.UpdateAsync(token, cancellationToken);
    }
}
