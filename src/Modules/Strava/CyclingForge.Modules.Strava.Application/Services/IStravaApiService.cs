namespace CyclingForge.Modules.Strava.Application.Services;

public interface IStravaApiService
{
    Task<StravaTokenResponse> ExchangeAuthorizationCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<StravaRefreshTokenResponse> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StravaActivityResponse>> GetActivitiesAsync(string accessToken, int page = 1, int perPage = 30, CancellationToken cancellationToken = default);
}

public sealed record StravaTokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    long AthleteId,
    string AthleteFirstName,
    string AthleteLastName,
    string? AthleteProfileImageUrl);

public sealed record StravaRefreshTokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt);

public sealed record StravaActivityResponse(
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
    float? AveragePower);
