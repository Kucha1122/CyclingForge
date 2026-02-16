using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;

namespace CyclingForge.Bootstrapper.Composition;

internal sealed class UserFtpProvider : IUserFtpProvider
{
    private readonly IUserRepository _userRepository;

    public UserFtpProvider(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<int?> GetFtpAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
        return user?.FunctionalThresholdPower;
    }
}
