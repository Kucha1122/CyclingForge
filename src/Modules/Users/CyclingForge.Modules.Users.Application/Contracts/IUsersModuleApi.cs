namespace CyclingForge.Modules.Users.Application.Contracts;

public interface IUsersModuleApi
{
    Task<bool> UserExistsAsync(Guid userId, CancellationToken cancellationToken = default);
}
