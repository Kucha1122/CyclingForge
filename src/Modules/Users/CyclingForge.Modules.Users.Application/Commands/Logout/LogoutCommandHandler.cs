using CyclingForge.Modules.Users.Application.Services;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.Logout;

internal sealed class LogoutCommandHandler : IRequestHandler<LogoutCommand>
{
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenProvider _tokenProvider;
    private readonly IClock _clock;

    public LogoutCommandHandler(
        IRefreshTokenRepository refreshTokenRepository,
        ITokenProvider tokenProvider,
        IClock clock)
    {
        _refreshTokenRepository = refreshTokenRepository;
        _tokenProvider = tokenProvider;
        _clock = clock;
    }

    public async Task Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        // Idempotent: silently ignore unknown/already-revoked tokens.
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return;

        var hash = _tokenProvider.HashRefreshToken(request.RefreshToken);
        var stored = await _refreshTokenRepository.GetByHashAsync(hash, cancellationToken);
        if (stored is null || stored.RevokedAtUtc is not null)
            return;

        stored.Revoke(_clock.CurrentDate());
        await _refreshTokenRepository.UpdateAsync(stored, cancellationToken);
    }
}
