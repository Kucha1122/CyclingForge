using CyclingForge.Modules.Garmin.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Exceptions;
using Microsoft.Extensions.Options;

namespace CyclingForge.Modules.Garmin.Infrastructure.Services;

internal sealed class GarminApiService : IGarminApiService
{
    private readonly GarminHttpClient _httpClient;
    private readonly GarminOptions _options;

    public GarminApiService(GarminHttpClient httpClient, IOptions<GarminOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<GarminRequestTokenResult> GetRequestTokenAsync(CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetRequestTokenAsync(
            _options.RequestTokenUrl,
            _options.ConsumerKey,
            _options.ConsumerSecret,
            _options.CallbackUrl,
            cancellationToken);

        if (string.IsNullOrEmpty(response.OAuthToken))
            throw new GarminAuthorizationException("Failed to get request token from Garmin.");

        return new GarminRequestTokenResult(response.OAuthToken, response.OAuthTokenSecret);
    }

    public string GetAuthorizeUrl(string oauthToken)
    {
        return $"{_options.AuthorizeUrl}?oauth_token={Uri.EscapeDataString(oauthToken)}";
    }

    public async Task<GarminAccessTokenResult> ExchangeForAccessTokenAsync(
        string oauthToken, string oauthTokenSecret, string oauthVerifier,
        CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.ExchangeForAccessTokenAsync(
            _options.AccessTokenUrl,
            _options.ConsumerKey,
            _options.ConsumerSecret,
            oauthToken,
            oauthTokenSecret,
            oauthVerifier,
            cancellationToken);

        if (string.IsNullOrEmpty(response.OAuthToken))
            throw new GarminAuthorizationException("Failed to exchange for access token.");

        return new GarminAccessTokenResult(response.OAuthToken, response.OAuthTokenSecret);
    }

    public async Task<IReadOnlyList<GarminSleepResponse>> GetSleepDataAsync(
        string accessToken, string accessTokenSecret,
        DateOnly startDate, DateOnly endDate,
        CancellationToken cancellationToken = default)
    {
        var entries = await _httpClient.GetSleepDataAsync(
            _options.ConsumerKey, _options.ConsumerSecret,
            accessToken, accessTokenSecret,
            startDate.ToString("yyyy-MM-dd"),
            endDate.ToString("yyyy-MM-dd"),
            cancellationToken);

        if (entries is null) return [];

        return entries.Select(e =>
        {
            DateOnly.TryParse(e.CalendarDate, out var date);
            return new GarminSleepResponse(
                date,
                e.SleepTimeInSeconds,
                e.DeepSleepDurationInSeconds,
                e.LightSleepDurationInSeconds,
                e.RemSleepInSeconds,
                e.AwakeDurationInSeconds,
                e.OverallSleepScore,
                e.AverageSpO2Value,
                e.AverageRespirationValue,
                e.SleepStartTimestampGmt.HasValue
                    ? DateTimeOffset.FromUnixTimeMilliseconds(e.SleepStartTimestampGmt.Value).UtcDateTime
                    : null,
                e.SleepEndTimestampGmt.HasValue
                    ? DateTimeOffset.FromUnixTimeMilliseconds(e.SleepEndTimestampGmt.Value).UtcDateTime
                    : null);
        }).ToList();
    }

    public async Task<GarminWellnessResponse?> GetDailyWellnessAsync(
        string accessToken, string accessTokenSecret,
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetDailyWellnessAsync(
            _options.ConsumerKey, _options.ConsumerSecret,
            accessToken, accessTokenSecret,
            date.ToString("yyyy-MM-dd"),
            cancellationToken);

        if (response is null) return null;

        return new GarminWellnessResponse(
            date,
            response.Vo2Max,
            response.TrainingReadinessScore,
            response.TrainingReadinessLevel,
            response.BodyBatteryMin,
            response.BodyBatteryMax,
            response.AverageStressLevel,
            response.TotalSteps);
    }
}
