namespace CyclingForge.Modules.Strava.Application.Contracts;

public interface IStravaModuleApi
{
    Task<string?> GetAccessTokenAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> IsConnectedAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns activities for the user from Strava DB (including StreamsJson when available). Returns null if user has no Strava athlete.
    /// When afterUtc and beforeUtc are provided, only activities with StartDate in [afterUtc, beforeUtc) are returned.
    /// </summary>
    Task<IReadOnlyList<StravaActivityWithStreamsDto>?> GetActivitiesWithStreamsForUserAsync(Guid userId, DateTime? afterUtc = null, DateTime? beforeUtc = null, CancellationToken cancellationToken = default);
}

public sealed record StravaActivityWithStreamsDto(
    long StravaId,
    string Name,
    string Type,
    DateTime StartDate,
    float Distance,
    int MovingTime,
    int ElapsedTime,
    float TotalElevationGain,
    float? AverageSpeed,
    float? MaxSpeed,
    float? AverageHeartRate,
    float? MaxHeartRate,
    float? AveragePower,
    bool? DeviceWatts,
    string? StreamsJson);
