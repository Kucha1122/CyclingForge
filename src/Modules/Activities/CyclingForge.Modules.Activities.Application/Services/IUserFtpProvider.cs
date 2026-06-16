namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Provides user FTP for TSS calculation. Implemented in the host (e.g. Bootstrapper) with access to Users module.
/// </summary>
public interface IUserFtpProvider
{
    Task<int?> GetFtpAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the effective FTP for the user on the given date (last manual or eFTP change on or before that date).
    /// </summary>
    Task<int?> GetFtpForDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns FTP change events in the date range for PMC chart markers (manual changes and eFTP from activities).
    /// </summary>
    Task<IReadOnlyList<FtpChangeDto>> GetFtpChangesForRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);

    Task<(int? lthr, int? maxHr, int? restingHr, string gender)> GetHeartRateZonesAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Returns the user's body weight in kilograms, or null when not set. Used for watts/kg metrics.</summary>
    Task<float?> GetWeightKgAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the minimum effort duration (seconds) used for eFTP estimation; default 300 (5 min) when not set.
    /// </summary>
    Task<int> GetEftpMinDurationSecondsAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Registers an automatic eFTP change on the FTP timeline when appropriate.
    /// Used during activity sync to persist significant eFTP updates (Source = "EstimatedFromActivity")
    /// so that calendar FTP and activity FTP use only the UserFtpChanges table.
    /// </summary>
    Task RegisterEftpChangeIfNeededAsync(Guid userId, DateTime activityDate, int estimatedFtp, CancellationToken cancellationToken = default);
}
