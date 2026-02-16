namespace CyclingForge.Modules.Strava.Application.Contracts;

public interface IStravaModuleApi
{
    Task<string?> GetAccessTokenAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> IsConnectedAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns activities for the user from Strava DB (including StreamsJson when available). Returns null if user has no Strava athlete.
    /// </summary>
    Task<IReadOnlyList<StravaActivityWithStreamsDto>?> GetActivitiesWithStreamsForUserAsync(Guid userId, CancellationToken cancellationToken = default);
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
    string? StreamsJson);
