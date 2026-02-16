namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Provides user LTHR (Lactate Threshold Heart Rate) for hrTSS calculation. Implemented in the host with access to Users module.
/// </summary>
public interface IUserLthrProvider
{
    Task<int?> GetLthrAsync(Guid userId, CancellationToken cancellationToken = default);
}
