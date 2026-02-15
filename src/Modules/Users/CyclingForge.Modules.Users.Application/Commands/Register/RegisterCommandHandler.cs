using CyclingForge.Modules.Users.Application.DTOs;
using CyclingForge.Modules.Users.Domain.Entities;
using CyclingForge.Modules.Users.Domain.Exceptions;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.Register;

internal sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, Guid>
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IClock _clock;

    public RegisterCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IClock clock)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _clock = clock;
    }

    public async Task<Guid> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var email = new Email(request.Email);

        if (await _userRepository.ExistsByEmailAsync(email, cancellationToken))
            throw new UserAlreadyExistsException(request.Email);

        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = User.Create(email, passwordHash, request.FirstName, request.LastName, _clock.CurrentDate());

        await _userRepository.AddAsync(user, cancellationToken);

        return user.Id.Value;
    }
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}
