using CyclingForge.Modules.Users.Application.DTOs;
using CyclingForge.Modules.Users.Application.Services;
using CyclingForge.Modules.Users.Domain.Entities;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Exceptions;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.RefreshToken;

internal sealed class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResultDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly ITokenProvider _tokenProvider;
    private readonly IClock _clock;

    public RefreshTokenCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        ITokenProvider tokenProvider,
        IClock clock)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _tokenProvider = tokenProvider;
        _clock = clock;
    }

    public async Task<AuthResultDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var now = _clock.CurrentDate();
        var hash = _tokenProvider.HashRefreshToken(request.RefreshToken);
        var stored = await _refreshTokenRepository.GetByHashAsync(hash, cancellationToken)
            ?? throw new UnauthorizedException("Invalid refresh token.");

        // Reuse of an already-revoked (rotated) token signals possible theft → revoke the whole chain.
        if (stored.RevokedAtUtc is not null)
        {
            await _refreshTokenRepository.RevokeAllForUserAsync(stored.UserId, now, cancellationToken);
            throw new UnauthorizedException("Refresh token has been revoked.");
        }

        if (!stored.IsActive(now))
            throw new UnauthorizedException("Refresh token has expired.");

        var user = await _userRepository.GetByIdAsync(new UserId(stored.UserId), cancellationToken)
            ?? throw new UnauthorizedException("User no longer exists.");

        // Rotate: issue a new refresh token inheriting the previous expiry policy
        // (no expiry => "remember me"), then revoke the old one pointing at its replacement.
        var rememberMe = stored.ExpiresAt is null;
        var rawRefresh = _tokenProvider.GenerateRefreshToken();
        var newToken = UserRefreshToken.Create(
            stored.UserId,
            _tokenProvider.HashRefreshToken(rawRefresh),
            _tokenProvider.GetRefreshTokenExpiry(rememberMe, now),
            now);
        await _refreshTokenRepository.AddAsync(newToken, cancellationToken);

        stored.Revoke(now, newToken.Id);
        await _refreshTokenRepository.UpdateAsync(stored, cancellationToken);

        var access = _tokenProvider.GenerateAccessToken(user.Id.Value, user.Email.Value);
        return new AuthResultDto(access.Token, rawRefresh, user.Id.Value, user.Email.Value, access.ExpiresAtUtc);
    }
}
