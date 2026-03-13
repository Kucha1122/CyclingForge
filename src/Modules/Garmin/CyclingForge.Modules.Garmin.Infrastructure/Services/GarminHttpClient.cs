using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;

namespace CyclingForge.Modules.Garmin.Infrastructure.Services;

internal sealed class GarminHttpClient
{
    private readonly HttpClient _httpClient;

    public GarminHttpClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<OAuthRequestTokenResponse> GetRequestTokenAsync(
        string requestTokenUrl, string consumerKey, string consumerSecret, string callbackUrl,
        CancellationToken cancellationToken)
    {
        var oauthParams = new SortedDictionary<string, string>
        {
            ["oauth_consumer_key"] = consumerKey,
            ["oauth_signature_method"] = "HMAC-SHA1",
            ["oauth_timestamp"] = GetTimestamp(),
            ["oauth_nonce"] = GetNonce(),
            ["oauth_version"] = "1.0",
            ["oauth_callback"] = callbackUrl
        };

        var signature = GenerateSignature("POST", requestTokenUrl, oauthParams, consumerSecret, "");
        oauthParams["oauth_signature"] = signature;

        var request = new HttpRequestMessage(HttpMethod.Post, requestTokenUrl);
        request.Headers.Add("Authorization", BuildAuthHeader(oauthParams));

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var parsed = ParseQueryString(body);

        return new OAuthRequestTokenResponse(
            parsed.GetValueOrDefault("oauth_token", ""),
            parsed.GetValueOrDefault("oauth_token_secret", ""));
    }

    public async Task<OAuthAccessTokenResponse> ExchangeForAccessTokenAsync(
        string accessTokenUrl, string consumerKey, string consumerSecret,
        string oauthToken, string oauthTokenSecret, string oauthVerifier,
        CancellationToken cancellationToken)
    {
        var oauthParams = new SortedDictionary<string, string>
        {
            ["oauth_consumer_key"] = consumerKey,
            ["oauth_signature_method"] = "HMAC-SHA1",
            ["oauth_timestamp"] = GetTimestamp(),
            ["oauth_nonce"] = GetNonce(),
            ["oauth_version"] = "1.0",
            ["oauth_token"] = oauthToken,
            ["oauth_verifier"] = oauthVerifier
        };

        var signature = GenerateSignature("POST", accessTokenUrl, oauthParams, consumerSecret, oauthTokenSecret);
        oauthParams["oauth_signature"] = signature;

        var request = new HttpRequestMessage(HttpMethod.Post, accessTokenUrl);
        request.Headers.Add("Authorization", BuildAuthHeader(oauthParams));

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var parsed = ParseQueryString(body);

        return new OAuthAccessTokenResponse(
            parsed.GetValueOrDefault("oauth_token", ""),
            parsed.GetValueOrDefault("oauth_token_secret", ""));
    }

    public async Task<List<GarminSleepApiResponse>?> GetSleepDataAsync(
        string consumerKey, string consumerSecret,
        string accessToken, string accessTokenSecret,
        string startDate, string endDate,
        CancellationToken cancellationToken)
    {
        var url = $"https://apis.garmin.com/wellness-api/rest/dailySleepData?startDate={startDate}&endDate={endDate}";
        var request = CreateSignedRequest(HttpMethod.Get, url, consumerKey, consumerSecret, accessToken, accessTokenSecret);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;

        return await response.Content.ReadFromJsonAsync<List<GarminSleepApiResponse>>(cancellationToken);
    }

    public async Task<GarminWellnessApiResponse?> GetDailyWellnessAsync(
        string consumerKey, string consumerSecret,
        string accessToken, string accessTokenSecret,
        string date,
        CancellationToken cancellationToken)
    {
        var url = $"https://apis.garmin.com/wellness-api/rest/dailyWellness?date={date}";
        var request = CreateSignedRequest(HttpMethod.Get, url, consumerKey, consumerSecret, accessToken, accessTokenSecret);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;

        return await response.Content.ReadFromJsonAsync<GarminWellnessApiResponse>(cancellationToken);
    }

    private HttpRequestMessage CreateSignedRequest(
        HttpMethod method, string fullUrl,
        string consumerKey, string consumerSecret,
        string accessToken, string accessTokenSecret)
    {
        var uri = new Uri(fullUrl);
        var baseUrl = $"{uri.Scheme}://{uri.Host}{uri.AbsolutePath}";

        var oauthParams = new SortedDictionary<string, string>
        {
            ["oauth_consumer_key"] = consumerKey,
            ["oauth_token"] = accessToken,
            ["oauth_signature_method"] = "HMAC-SHA1",
            ["oauth_timestamp"] = GetTimestamp(),
            ["oauth_nonce"] = GetNonce(),
            ["oauth_version"] = "1.0"
        };

        var allParams = new SortedDictionary<string, string>(oauthParams);
        if (!string.IsNullOrEmpty(uri.Query))
        {
            foreach (var pair in ParseQueryString(uri.Query.TrimStart('?')))
            {
                allParams[pair.Key] = pair.Value;
            }
        }

        var signature = GenerateSignature(method.Method, baseUrl, allParams, consumerSecret, accessTokenSecret);
        oauthParams["oauth_signature"] = signature;

        var request = new HttpRequestMessage(method, fullUrl);
        request.Headers.Add("Authorization", BuildAuthHeader(oauthParams));
        return request;
    }

    private static string GenerateSignature(
        string httpMethod, string baseUrl,
        SortedDictionary<string, string> parameters,
        string consumerSecret, string tokenSecret)
    {
        var paramString = string.Join("&",
            parameters.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));

        var signatureBase = $"{httpMethod.ToUpper()}&{Uri.EscapeDataString(baseUrl)}&{Uri.EscapeDataString(paramString)}";
        var signingKey = $"{Uri.EscapeDataString(consumerSecret)}&{Uri.EscapeDataString(tokenSecret)}";

        using var hmac = new HMACSHA1(Encoding.ASCII.GetBytes(signingKey));
        var hash = hmac.ComputeHash(Encoding.ASCII.GetBytes(signatureBase));
        return Convert.ToBase64String(hash);
    }

    private static string BuildAuthHeader(SortedDictionary<string, string> oauthParams)
    {
        var parts = oauthParams.Select(p => $"{Uri.EscapeDataString(p.Key)}=\"{Uri.EscapeDataString(p.Value)}\"");
        return $"OAuth {string.Join(", ", parts)}";
    }

    private static string GetTimestamp()
        => DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

    private static string GetNonce()
        => Guid.NewGuid().ToString("N");

    private static Dictionary<string, string> ParseQueryString(string query)
    {
        return query.Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Split('=', 2))
            .Where(p => p.Length == 2)
            .ToDictionary(
                p => Uri.UnescapeDataString(p[0]),
                p => Uri.UnescapeDataString(p[1]));
    }
}

internal sealed record OAuthRequestTokenResponse(string OAuthToken, string OAuthTokenSecret);
internal sealed record OAuthAccessTokenResponse(string OAuthToken, string OAuthTokenSecret);

internal sealed class GarminSleepApiResponse
{
    [JsonPropertyName("calendarDate")]
    public string? CalendarDate { get; set; }

    [JsonPropertyName("sleepTimeInSeconds")]
    public int SleepTimeInSeconds { get; set; }

    [JsonPropertyName("deepSleepDurationInSeconds")]
    public int DeepSleepDurationInSeconds { get; set; }

    [JsonPropertyName("lightSleepDurationInSeconds")]
    public int LightSleepDurationInSeconds { get; set; }

    [JsonPropertyName("remSleepInSeconds")]
    public int RemSleepInSeconds { get; set; }

    [JsonPropertyName("awakeDurationInSeconds")]
    public int AwakeDurationInSeconds { get; set; }

    [JsonPropertyName("overallSleepScore")]
    public int? OverallSleepScore { get; set; }

    [JsonPropertyName("averageSpO2Value")]
    public float? AverageSpO2Value { get; set; }

    [JsonPropertyName("averageRespirationValue")]
    public float? AverageRespirationValue { get; set; }

    [JsonPropertyName("sleepStartTimestampGMT")]
    public long? SleepStartTimestampGmt { get; set; }

    [JsonPropertyName("sleepEndTimestampGMT")]
    public long? SleepEndTimestampGmt { get; set; }
}

internal sealed class GarminWellnessApiResponse
{
    [JsonPropertyName("calendarDate")]
    public string? CalendarDate { get; set; }

    [JsonPropertyName("vo2Max")]
    public float? Vo2Max { get; set; }

    [JsonPropertyName("trainingReadinessScore")]
    public int? TrainingReadinessScore { get; set; }

    [JsonPropertyName("trainingReadinessLevel")]
    public string? TrainingReadinessLevel { get; set; }

    [JsonPropertyName("bodyBatteryChargedValue")]
    public int? BodyBatteryMax { get; set; }

    [JsonPropertyName("bodyBatteryDrainedValue")]
    public int? BodyBatteryMin { get; set; }

    [JsonPropertyName("averageStressLevel")]
    public int? AverageStressLevel { get; set; }

    [JsonPropertyName("totalSteps")]
    public int? TotalSteps { get; set; }
}
