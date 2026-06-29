using CyclingForge.Modules.Users.Application.Commands.Register;
using CyclingForge.Modules.Users.Application.DTOs;
using CyclingForge.Modules.Users.Application.Services;
using CyclingForge.Modules.Users.Domain.Entities;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Exceptions;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.Login;

internal sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenProvider _tokenProvider;
    private readonly IClock _clock;

    public LoginCommandHandler(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IPasswordHasher passwordHasher,
        ITokenProvider tokenProvider,
        IClock clock)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _passwordHasher = passwordHasher;
        _tokenProvider = tokenProvider;
        _clock = clock;
    }

    public async Task<AuthResultDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var email = new Email(request.Email);
        var user = await _userRepository.GetByEmailAsync(email, cancellationToken)
            ?? throw new NotFoundException("User", request.Email);

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new InvalidCredentialsException();

        var now = _clock.CurrentDate();
        user.UpdateLastLogin(now);
        await _userRepository.UpdateAsync(user, cancellationToken);

        var access = _tokenProvider.GenerateAccessToken(user.Id.Value, user.Email.Value);

        var rawRefresh = _tokenProvider.GenerateRefreshToken();
        var refreshEntity = UserRefreshToken.Create(
            user.Id.Value,
            _tokenProvider.HashRefreshToken(rawRefresh),
            _tokenProvider.GetRefreshTokenExpiry(request.RememberMe, now),
            now);
        await _refreshTokenRepository.AddAsync(refreshEntity, cancellationToken);

        return new AuthResultDto(access.Token, rawRefresh, user.Id.Value, user.Email.Value, access.ExpiresAtUtc);
    }
}

public sealed class InvalidCredentialsException : CyclingForgeException
{
    public InvalidCredentialsException() : base("Invalid email or password.")
    {
    }
}
