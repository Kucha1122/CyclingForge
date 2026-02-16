using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace CyclingForge.Modules.Strava.Infrastructure.Services;

internal sealed class StravaHttpClient
{
    private readonly HttpClient _httpClient;

    public StravaHttpClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri("https://www.strava.com/api/v3/");
    }

    public async Task<StravaOAuthTokenResponse?> ExchangeCodeAsync(
        string clientId, string clientSecret, string code, CancellationToken cancellationToken)
    {
        var payload = new
        {
            client_id = clientId,
            client_secret = clientSecret,
            code,
            grant_type = "authorization_code"
        };

        var response = await _httpClient.PostAsJsonAsync("https://www.strava.com/oauth/token", payload, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<StravaOAuthTokenResponse>(cancellationToken);
    }

    public async Task<StravaOAuthTokenResponse?> RefreshAsync(
        string clientId, string clientSecret, string refreshToken, CancellationToken cancellationToken)
    {
        var payload = new
        {
            client_id = clientId,
            client_secret = clientSecret,
            refresh_token = refreshToken,
            grant_type = "refresh_token"
        };

        var response = await _httpClient.PostAsJsonAsync("https://www.strava.com/oauth/token", payload, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<StravaOAuthTokenResponse>(cancellationToken);
    }

    public async Task<List<StravaActivityApiResponse>?> GetActivitiesAsync(
        string accessToken, int page, int perPage, long? after = null, long? before = null, CancellationToken cancellationToken = default)
    {
        var query = $"athlete/activities?page={page}&per_page={perPage}";
        if (after.HasValue)
            query += $"&after={after.Value}";
        if (before.HasValue)
            query += $"&before={before.Value}";

        var request = new HttpRequestMessage(HttpMethod.Get, query);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<List<StravaActivityApiResponse>>(cancellationToken);
    }

    public async Task<string?> GetActivityStreamsAsync(
        string accessToken, long activityId, string[] keys, CancellationToken cancellationToken)
    {
        var keysString = string.Join(",", keys);
        var request = new HttpRequestMessage(HttpMethod.Get,
            $"activities/{activityId}/streams?keys={keysString}&key_by_type=false");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }
        
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }
}

internal sealed class StravaOAuthTokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refresh_token")]
    public string RefreshToken { get; set; } = string.Empty;

    [JsonPropertyName("expires_at")]
    public long ExpiresAt { get; set; }

    [JsonPropertyName("athlete")]
    public StravaAthleteApiResponse? Athlete { get; set; }
}

internal sealed class StravaAthleteApiResponse
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("firstname")]
    public string FirstName { get; set; } = string.Empty;

    [JsonPropertyName("lastname")]
    public string LastName { get; set; } = string.Empty;

    [JsonPropertyName("profile")]
    public string? Profile { get; set; }
}

internal sealed class StravaActivityApiResponse
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("start_date")]
    public DateTime StartDate { get; set; }

    [JsonPropertyName("distance")]
    public float Distance { get; set; }

    [JsonPropertyName("moving_time")]
    public int MovingTime { get; set; }

    [JsonPropertyName("elapsed_time")]
    public int ElapsedTime { get; set; }

    [JsonPropertyName("total_elevation_gain")]
    public float TotalElevationGain { get; set; }

    [JsonPropertyName("average_speed")]
    public float? AverageSpeed { get; set; }

    [JsonPropertyName("max_speed")]
    public float? MaxSpeed { get; set; }

    [JsonPropertyName("average_heartrate")]
    public float? AverageHeartRate { get; set; }

    [JsonPropertyName("max_heartrate")]
    public float? MaxHeartRate { get; set; }

    [JsonPropertyName("average_watts")]
    public float? AveragePower { get; set; }
}

internal sealed class StravaStreamApiResponse
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    public List<object> Data { get; set; } = [];

    [JsonPropertyName("series_type")]
    public string SeriesType { get; set; } = string.Empty;

    [JsonPropertyName("original_size")]
    public int OriginalSize { get; set; }

    [JsonPropertyName("resolution")]
    public string Resolution { get; set; } = string.Empty;
}
