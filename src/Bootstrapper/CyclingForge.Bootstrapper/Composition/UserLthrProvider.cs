using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;

namespace CyclingForge.Bootstrapper.Composition;

internal sealed class UserLthrProvider : IUserLthrProvider
{
    private readonly IUserRepository _userRepository;

    public UserLthrProvider(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<int?> GetLthrAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
        return user?.LactateThresholdHeartRate;
    }
}
