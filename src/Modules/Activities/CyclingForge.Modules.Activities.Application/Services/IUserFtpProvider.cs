namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Provides user FTP for TSS calculation. Implemented in the host (e.g. Bootstrapper) with access to Users module.
/// </summary>
public interface IUserFtpProvider
{
    Task<int?> GetFtpAsync(Guid userId, CancellationToken cancellationToken = default);
}
