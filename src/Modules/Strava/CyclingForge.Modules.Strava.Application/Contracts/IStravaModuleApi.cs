namespace CyclingForge.Modules.Strava.Application.Contracts;

public interface IStravaModuleApi
{
    Task<string?> GetAccessTokenAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> IsConnectedAsync(Guid userId, CancellationToken cancellationToken = default);
}
