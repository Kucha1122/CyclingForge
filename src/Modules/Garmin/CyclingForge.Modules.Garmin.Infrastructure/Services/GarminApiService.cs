using CyclingForge.Modules.Garmin.Application.Services;

namespace CyclingForge.Modules.Garmin.Infrastructure.Services;

internal sealed class GarminApiService : IGarminApiService
{
    private readonly GarminHttpClient _httpClient;

    public GarminApiService(GarminHttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<GarminConnectResult> ConnectAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var result = await _httpClient.LoginAsync(email, password, cancellationToken);
        return result.IsMfaRequired
            ? GarminConnectResult.MfaRequired(result.SessionId!)
            : GarminConnectResult.Success(result.Token!);
    }

    public Task<string> ConnectMfaAsync(string sessionId, string mfaCode, CancellationToken cancellationToken = default)
        => _httpClient.LoginMfaAsync(sessionId, mfaCode, cancellationToken);

    public async Task<IReadOnlyList<GarminSleepResponse>> GetSleepDataAsync(
        string garthToken, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
    {
        var entries = await _httpClient.GetSleepAsync(
            garthToken,
            startDate.ToString("yyyy-MM-dd"),
            endDate.ToString("yyyy-MM-dd"),
            cancellationToken);

        if (entries is null) return [];

        return entries.Select(e =>
        {
            DateOnly.TryParse(e.Date, out var date);
            var levels = (e.SleepLevels ?? [])
                .Select(l => new GarminSleepLevel(l.StartGmt ?? "", l.EndGmt ?? "", l.ActivityLevel))
                .ToList();
            return new GarminSleepResponse(
                date,
                e.TotalSleepSeconds,
                e.DeepSleepSeconds,
                e.LightSleepSeconds,
                e.RemSleepSeconds,
                e.AwakeSeconds,
                e.SleepScore,
                e.AverageSpO2,
                e.AverageRespirationRate,
                // SleepStartTime/SleepEndTime are naive (no 'Z') — keep as-is.
                e.SleepStartTime,
                e.SleepEndTime,
                levels);
        }).ToList();
    }

    public async Task<GarminWellnessResponse?> GetDailyWellnessAsync(
        string garthToken, DateOnly date, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetWellnessAsync(
            garthToken, date.ToString("yyyy-MM-dd"), cancellationToken);

        if (response is null) return null;

        return new GarminWellnessResponse(
            date,
            response.Vo2Max,
            response.TrainingReadinessScore,
            response.TrainingReadinessLevel,
            response.BodyBatteryMin,
            response.BodyBatteryMax,
            response.AverageStressLevel,
            response.StepsCount);
    }

    public async Task<GarminHrvResponse?> GetHrvDataAsync(
        string garthToken, DateOnly date, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetHrvAsync(
            garthToken, date.ToString("yyyy-MM-dd"), cancellationToken);

        if (response is null) return null;

        return new GarminHrvResponse(
            date,
            response.LastNightAvgMs,
            response.LastNight5MinHighMs,
            response.Status);
    }
}
