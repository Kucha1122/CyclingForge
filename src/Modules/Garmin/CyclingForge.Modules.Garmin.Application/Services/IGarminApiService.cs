namespace CyclingForge.Modules.Garmin.Application.Services;

public interface IGarminApiService
{
    Task<GarminRequestTokenResult> GetRequestTokenAsync(CancellationToken cancellationToken = default);
    string GetAuthorizeUrl(string oauthToken);
    Task<GarminAccessTokenResult> ExchangeForAccessTokenAsync(string oauthToken, string oauthTokenSecret, string oauthVerifier, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GarminSleepResponse>> GetSleepDataAsync(string accessToken, string accessTokenSecret, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
    Task<GarminWellnessResponse?> GetDailyWellnessAsync(string accessToken, string accessTokenSecret, DateOnly date, CancellationToken cancellationToken = default);
}

public sealed record GarminRequestTokenResult(
    string OAuthToken,
    string OAuthTokenSecret);

public sealed record GarminAccessTokenResult(
    string AccessToken,
    string AccessTokenSecret);

public sealed record GarminSleepResponse(
    DateOnly Date,
    int TotalSleepSeconds,
    int DeepSleepSeconds,
    int LightSleepSeconds,
    int RemSleepSeconds,
    int AwakeSeconds,
    int? SleepScore,
    float? AverageSpO2,
    float? AverageRespirationRate,
    DateTime? SleepStartTime,
    DateTime? SleepEndTime);

public sealed record GarminWellnessResponse(
    DateOnly Date,
    float? Vo2MaxMlPerMinPerKg,
    int? TrainingReadinessScore,
    string? TrainingReadinessLevel,
    int? BodyBatteryMin,
    int? BodyBatteryMax,
    int? AverageStressLevel,
    int? StepsCount);
