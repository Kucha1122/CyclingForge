using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Exceptions;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace CyclingForge.Modules.Strava.Infrastructure.Services;

internal sealed class StravaApiService : IStravaApiService
{
    private readonly StravaHttpClient _httpClient;
    private readonly StravaOptions _options;

    public StravaApiService(StravaHttpClient httpClient, IOptions<StravaOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<StravaTokenResponse> ExchangeAuthorizationCodeAsync(
        string code, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.ExchangeCodeAsync(
            _options.ClientId, _options.ClientSecret, code, cancellationToken)
            ?? throw new StravaAuthorizationException("Failed to exchange authorization code.");

        return new StravaTokenResponse(
            response.AccessToken,
            response.RefreshToken,
            DateTimeOffset.FromUnixTimeSeconds(response.ExpiresAt).UtcDateTime,
            response.Athlete?.Id ?? 0,
            response.Athlete?.FirstName ?? string.Empty,
            response.Athlete?.LastName ?? string.Empty,
            response.Athlete?.Profile);
    }

    public async Task<StravaRefreshTokenResponse> RefreshTokenAsync(
        string refreshToken, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.RefreshAsync(
            _options.ClientId, _options.ClientSecret, refreshToken, cancellationToken)
            ?? throw new StravaAuthorizationException("Failed to refresh token.");

        return new StravaRefreshTokenResponse(
            response.AccessToken,
            response.RefreshToken,
            DateTimeOffset.FromUnixTimeSeconds(response.ExpiresAt).UtcDateTime);
    }

    public async Task<IReadOnlyList<StravaActivityResponse>> GetActivitiesAsync(
        string accessToken, int page = 1, int perPage = 30, long? after = null, long? before = null, CancellationToken cancellationToken = default)
    {
        var activities = await _httpClient.GetActivitiesAsync(accessToken, page, perPage, after, before, cancellationToken);
        // Strava API returns speed in m/s; convert to km/h for storage and display.
        const float MetersPerSecondToKmh = 3.6f;
        return activities?.Select(a => new StravaActivityResponse(
            a.Id, a.Name, a.Type, a.StartDate, a.Distance,
            a.MovingTime, a.ElapsedTime, a.TotalElevationGain,
            a.AverageSpeed.HasValue ? a.AverageSpeed.Value * MetersPerSecondToKmh : null,
            a.MaxSpeed.HasValue ? a.MaxSpeed.Value * MetersPerSecondToKmh : null,
            a.AverageHeartRate,
            a.MaxHeartRate, a.AveragePower, a.DeviceWatts)).ToList()
            ?? [];
    }

    public async Task<StravaActivityResponse?> GetActivityByIdAsync(
        string accessToken, long activityId, CancellationToken cancellationToken = default)
    {
        var a = await _httpClient.GetActivityAsync(accessToken, activityId, cancellationToken);
        if (a is null)
        {
            return null;
        }

        // Strava API returns speed in m/s; convert to km/h for storage and display.
        const float MetersPerSecondToKmh = 3.6f;
        return new StravaActivityResponse(
            a.Id, a.Name, a.Type, a.StartDate, a.Distance,
            a.MovingTime, a.ElapsedTime, a.TotalElevationGain,
            a.AverageSpeed.HasValue ? a.AverageSpeed.Value * MetersPerSecondToKmh : null,
            a.MaxSpeed.HasValue ? a.MaxSpeed.Value * MetersPerSecondToKmh : null,
            a.AverageHeartRate,
            a.MaxHeartRate, a.AveragePower, a.DeviceWatts);
    }

    public async Task<StravaZonesResponse?> GetZonesAsync(
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var zones = await _httpClient.GetZonesAsync(accessToken, cancellationToken);
        if (zones is null)
        {
            return null;
        }

        var heartRateZones = zones.HeartRate?.Zones?
            .Select(z => new StravaZoneRange(z.Min, z.Max))
            .ToList() ?? [];

        var powerZones = zones.Power?.Zones?
            .Select(z => new StravaZoneRange(z.Min, z.Max))
            .ToList() ?? [];

        return new StravaZonesResponse(heartRateZones, powerZones);
    }

    public async Task<string?> GetActivityStreamsJsonAsync(
        string accessToken, long activityId, string[] keys, CancellationToken cancellationToken = default)
    {
        var streamsJson = await _httpClient.GetActivityStreamsAsync(accessToken, activityId, keys, cancellationToken);
        
        if (string.IsNullOrEmpty(streamsJson))
        {
            return null;
        }

        try
        {
            // Try to parse as array first (expected format)
            // We just validate it's an array, we don't need to deserialize fully if we just want to return the string.
            // But to be safe and consistent, let's check.
            using var doc = JsonDocument.Parse(streamsJson);
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                return streamsJson;
            }
            else if (doc.RootElement.ValueKind == JsonValueKind.Object)
            {
                // Convert object format to array format
                var streamsDict = JsonSerializer.Deserialize<Dictionary<string, StravaStreamApiResponse>>(streamsJson);
                if (streamsDict != null)
                {
                    var streamsList = streamsDict.Select(kvp => {
                        kvp.Value.Type = kvp.Key;
                        return kvp.Value;
                    }).ToList();
                    return JsonSerializer.Serialize(streamsList);
                }
            }
        }
        catch (Exception)
        {
             // Log error if needed, but for now just return null or original json?
             // If parsing fails, it might be better to return null to avoid saving bad data.
        }

        return null;
    }
}

public sealed class StravaOptions
{
    public const string SectionName = "Strava";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;

    /// <summary>Publicly reachable URL that Strava will POST webhook events to (e.g. https://host/api/strava/webhook).</summary>
    public string WebhookCallbackUrl { get; set; } = string.Empty;

    /// <summary>Shared secret echoed during the GET subscription validation handshake.</summary>
    public string WebhookVerifyToken { get; set; } = string.Empty;
}
