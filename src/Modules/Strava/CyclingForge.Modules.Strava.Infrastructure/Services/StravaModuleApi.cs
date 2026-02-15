using CyclingForge.Modules.Strava.Application.Contracts;
using CyclingForge.Modules.Strava.Application.Commands.RefreshToken;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Infrastructure.Services;

internal sealed class StravaModuleApi : IStravaModuleApi
{
    private readonly IStravaTokenRepository _tokenRepository;
    private readonly IMediator _mediator;
    private readonly IClock _clock;

    public StravaModuleApi(
        IStravaTokenRepository tokenRepository,
        IMediator mediator,
        IClock clock)
    {
        _tokenRepository = tokenRepository;
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
}
