using CyclingForge.Modules.Users.Application.Commands.Register;
using CyclingForge.Modules.Users.Application.DTOs;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Exceptions;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.Login;

internal sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenProvider _tokenProvider;
    private readonly IClock _clock;

    public LoginCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        ITokenProvider tokenProvider,
        IClock clock)
    {
        _userRepository = userRepository;
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

        user.UpdateLastLogin(_clock.CurrentDate());
        await _userRepository.UpdateAsync(user, cancellationToken);

        var token = _tokenProvider.Generate(user.Id.Value, user.Email.Value);

        return new AuthResultDto(token, user.Id.Value, user.Email.Value);
    }
}

public interface ITokenProvider
{
    string Generate(Guid userId, string email);
}

public sealed class InvalidCredentialsException : CyclingForgeException
{
    public InvalidCredentialsException() : base("Invalid email or password.")
    {
    }
}
