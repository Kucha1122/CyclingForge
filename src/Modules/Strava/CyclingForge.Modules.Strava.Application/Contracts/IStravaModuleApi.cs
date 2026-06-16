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

    /// <summary>
    /// Computes time spent in each heart-rate zone (from stored streams + the user's HR zone
    /// definitions) for the user's activities in [afterUtc, beforeUtc). Returns null if the user
    /// has no Strava athlete; an empty list if there are no activities in range. When the user has
    /// no HR zones configured, each activity reports an empty <see cref="ActivityHrZonesDto.SecondsPerZone"/>.
    /// </summary>
    Task<IReadOnlyList<ActivityHrZonesDto>?> GetHrTimeInZonesForUserAsync(Guid userId, DateTime afterUtc, DateTime beforeUtc, CancellationToken cancellationToken = default);
}

public sealed record ActivityHrZonesDto(
    long StravaId,
    IReadOnlyList<int> SecondsPerZone);

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
