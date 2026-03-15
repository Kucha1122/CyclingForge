namespace CyclingForge.Modules.Workouts.Application.Services;

/// <summary>
/// Provides user FTP for FIT workout import (watts → % FTP conversion).
/// Implemented in the host with access to user profile.
/// </summary>
public interface IWorkoutImportFtpProvider
{
    Task<int?> GetFtpAsync(Guid userId, CancellationToken cancellationToken = default);
}
