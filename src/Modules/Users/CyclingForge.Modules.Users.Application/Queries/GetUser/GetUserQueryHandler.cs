using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Exceptions;
using MediatR;

namespace CyclingForge.Modules.Users.Application.Queries.GetUser;

internal sealed class GetUserQueryHandler : IRequestHandler<GetUserQuery, UserDto>
{
    private readonly IUserRepository _userRepository;

    public GetUserQueryHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserDto> Handle(GetUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(new UserId(request.UserId), cancellationToken)
            ?? throw new NotFoundException("User", request.UserId);

        return new UserDto(
            user.Id.Value,
            user.Email.Value,
            user.FirstName,
            user.LastName,
            user.CreatedAt,
            user.IsActive);
    }
}
