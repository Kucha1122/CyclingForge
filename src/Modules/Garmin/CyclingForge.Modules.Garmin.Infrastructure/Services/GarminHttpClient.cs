using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using CyclingForge.Modules.Garmin.Domain.Exceptions;

namespace CyclingForge.Modules.Garmin.Infrastructure.Services;

/// <summary>
/// Typed HTTP client for the Python garmin-connect microservice.
/// Replaces the previous hand-rolled OAuth 1.0a Garmin Wellness API calls.
/// </summary>
internal sealed class GarminHttpClient
{
    private readonly HttpClient _httpClient;

    public GarminHttpClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<GarminLoginResult> LoginAsync(string email, string password, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/login", new LoginRequest(email, password), cancellationToken);

        if (response.StatusCode is HttpStatusCode.Unauthorized)
            throw new GarminAuthorizationException("Invalid Garmin credentials.");

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<LoginResponse>(cancellationToken);
        if (body is null) throw new GarminAuthorizationException("Empty response from Garmin service.");

        if (body.NeedsMfa && !string.IsNullOrEmpty(body.SessionId))
            return GarminLoginResult.MfaRequired(body.SessionId);

        if (string.IsNullOrEmpty(body.Token))
            throw new GarminAuthorizationException("Garmin service returned an empty session token.");

        return GarminLoginResult.Success(body.Token);
    }

    public async Task<string> LoginMfaAsync(string sessionId, string mfaCode, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/login/mfa", new MfaRequest(sessionId, mfaCode), cancellationToken);

        if (response.StatusCode is HttpStatusCode.Unauthorized)
            throw new GarminAuthorizationException("Invalid MFA code.");

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<LoginResponse>(cancellationToken);
        if (string.IsNullOrEmpty(body?.Token))
            throw new GarminAuthorizationException("Garmin service returned an empty session token after MFA.");

        return body.Token;
    }

    public async Task<List<SleepDto>?> GetSleepAsync(
        string token, string startDate, string endDate, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/sleep", new SleepRequest(token, startDate, endDate), cancellationToken);

        EnsureNotExpired(response);
        if (!response.IsSuccessStatusCode) return null;

        return await response.Content.ReadFromJsonAsync<List<SleepDto>>(cancellationToken);
    }

    public async Task<WellnessDto?> GetWellnessAsync(
        string token, string date, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/wellness", new DateRequest(token, date), cancellationToken);

        EnsureNotExpired(response);
        if (!response.IsSuccessStatusCode) return null;

        return await response.Content.ReadFromJsonAsync<WellnessDto>(cancellationToken);
    }

    public async Task<HrvDto?> GetHrvAsync(
        string token, string date, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/hrv", new DateRequest(token, date), cancellationToken);

        EnsureNotExpired(response);
        if (!response.IsSuccessStatusCode) return null;

        return await response.Content.ReadFromJsonAsync<HrvDto>(cancellationToken);
    }

    private static void EnsureNotExpired(HttpResponseMessage response)
    {
        if (response.StatusCode is HttpStatusCode.Unauthorized)
            throw new GarminAuthorizationException("Garmin session expired. Please reconnect your account.");
    }
}

internal sealed record GarminLoginResult(bool IsMfaRequired, string? Token, string? SessionId)
{
    public static GarminLoginResult Success(string token) => new(false, token, null);
    public static GarminLoginResult MfaRequired(string sessionId) => new(true, null, sessionId);
}

internal sealed record LoginRequest(string Email, string Password);
internal sealed record MfaRequest(string SessionId, string MfaCode);
internal sealed record SleepRequest(string Token, string StartDate, string EndDate);
internal sealed record DateRequest(string Token, string Date);

internal sealed class LoginResponse
{
    [JsonPropertyName("token")] public string? Token { get; set; }
    [JsonPropertyName("needsMfa")] public bool NeedsMfa { get; set; }
    [JsonPropertyName("sessionId")] public string? SessionId { get; set; }
}

internal sealed class SleepDto
{
    [JsonPropertyName("date")] public string? Date { get; set; }
    [JsonPropertyName("totalSleepSeconds")] public int TotalSleepSeconds { get; set; }
    [JsonPropertyName("deepSleepSeconds")] public int DeepSleepSeconds { get; set; }
    [JsonPropertyName("lightSleepSeconds")] public int LightSleepSeconds { get; set; }
    [JsonPropertyName("remSleepSeconds")] public int RemSleepSeconds { get; set; }
    [JsonPropertyName("awakeSeconds")] public int AwakeSeconds { get; set; }
    [JsonPropertyName("sleepScore")] public int? SleepScore { get; set; }
    [JsonPropertyName("averageSpO2")] public float? AverageSpO2 { get; set; }
    [JsonPropertyName("averageRespirationRate")] public float? AverageRespirationRate { get; set; }
    // Naive datetime (no 'Z') — local wall-clock time, not UTC.
    [JsonPropertyName("sleepStartTime")] public DateTime? SleepStartTime { get; set; }
    [JsonPropertyName("sleepEndTime")] public DateTime? SleepEndTime { get; set; }
    [JsonPropertyName("sleepLevels")] public List<SleepLevelDto>? SleepLevels { get; set; }
}

internal sealed class SleepLevelDto
{
    [JsonPropertyName("startGmt")] public string? StartGmt { get; set; }
    [JsonPropertyName("endGmt")] public string? EndGmt { get; set; }
    [JsonPropertyName("activityLevel")] public float ActivityLevel { get; set; }
}

internal sealed class WellnessDto
{
    [JsonPropertyName("date")] public string? Date { get; set; }
    [JsonPropertyName("vo2MaxMlPerMinPerKg")] public float? Vo2Max { get; set; }
    [JsonPropertyName("trainingReadinessScore")] public int? TrainingReadinessScore { get; set; }
    [JsonPropertyName("trainingReadinessLevel")] public string? TrainingReadinessLevel { get; set; }
    [JsonPropertyName("bodyBatteryMin")] public int? BodyBatteryMin { get; set; }
    [JsonPropertyName("bodyBatteryMax")] public int? BodyBatteryMax { get; set; }
    [JsonPropertyName("averageStressLevel")] public int? AverageStressLevel { get; set; }
    [JsonPropertyName("stepsCount")] public int? StepsCount { get; set; }
}

internal sealed class HrvDto
{
    [JsonPropertyName("date")] public string? Date { get; set; }
    [JsonPropertyName("lastNightAvgMs")] public int? LastNightAvgMs { get; set; }
    [JsonPropertyName("lastNight5MinHighMs")] public int? LastNight5MinHighMs { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
}
