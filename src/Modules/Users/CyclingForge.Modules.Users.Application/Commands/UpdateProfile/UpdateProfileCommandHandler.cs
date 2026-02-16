using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Exceptions;
using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.UpdateProfile;

internal sealed class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand>
{
    private readonly IUserRepository _userRepository;

    public UpdateProfileCommandHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(new UserId(request.UserId));
        if (user is null)
        {
            throw new NotFoundException("User", request.UserId);
        }

        user.UpdateProfile(request.Ftp, request.WeightKg, request.Lthr);
        await _userRepository.UpdateAsync(user);
    }
}
