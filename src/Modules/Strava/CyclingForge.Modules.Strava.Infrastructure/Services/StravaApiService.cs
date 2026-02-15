using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Exceptions;
using Microsoft.Extensions.Options;

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
        string accessToken, int page = 1, int perPage = 30, CancellationToken cancellationToken = default)
    {
        var activities = await _httpClient.GetActivitiesAsync(accessToken, page, perPage, cancellationToken);

        return activities?.Select(a => new StravaActivityResponse(
            a.Id, a.Name, a.Type, a.StartDate, a.Distance,
            a.MovingTime, a.ElapsedTime, a.TotalElevationGain,
            a.AverageSpeed, a.MaxSpeed, a.AverageHeartRate,
            a.MaxHeartRate, a.AveragePower)).ToList()
            ?? [];
    }
}

public sealed class StravaOptions
{
    public const string SectionName = "Strava";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}
