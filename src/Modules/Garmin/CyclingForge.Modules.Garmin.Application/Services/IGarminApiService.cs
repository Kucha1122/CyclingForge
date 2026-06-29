namespace CyclingForge.Modules.Garmin.Application.Services;

public interface IGarminApiService
{
    /// <summary>
    /// Step 1: Logs in with email/password. Returns a token on success, or a
    /// GarminConnectResult with NeedsMfa=true + SessionId when 2FA is required.
    /// </summary>
    Task<GarminConnectResult> ConnectAsync(string email, string password, CancellationToken cancellationToken = default);

    /// <summary>
    /// Step 2 (2FA accounts only): Completes the login with the TOTP code.
    /// Returns the garth session token.
    /// </summary>
    Task<string> ConnectMfaAsync(string sessionId, string mfaCode, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<GarminSleepResponse>> GetSleepDataAsync(string garthToken, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GarminWellnessResponse>> GetWellnessDataAsync(string garthToken, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GarminHrvResponse>> GetHrvDataAsync(string garthToken, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
}

public sealed record GarminConnectResult(bool NeedsMfa, string? Token, string? SessionId)
{
    public static GarminConnectResult Success(string token) => new(false, token, null);
    public static GarminConnectResult MfaRequired(string sessionId) => new(true, null, sessionId);
}

/// <summary>One sleep-stage segment (5-min interval from Garmin's sleepMovement).</summary>
/// <param name="StartGmt">"YYYY-MM-DD HH:MM:SS" UTC string.</param>
/// <param name="EndGmt">"YYYY-MM-DD HH:MM:SS" UTC string.</param>
/// <param name="ActivityLevel">0=deep, 1=light, 2=rem, 3=awake.</param>
public sealed record GarminSleepLevel(string StartGmt, string EndGmt, float ActivityLevel);

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
    DateTime? SleepEndTime,
    IReadOnlyList<GarminSleepLevel> SleepLevels);

public sealed record GarminWellnessResponse(
    DateOnly Date,
    float? Vo2MaxMlPerMinPerKg,
    int? TrainingReadinessScore,
    string? TrainingReadinessLevel,
    int? BodyBatteryMin,
    int? BodyBatteryMax,
    int? AverageStressLevel,
    int? StepsCount);

public sealed record GarminHrvResponse(
    DateOnly Date,
    int? LastNightAvgMs,
    int? LastNight5MinHighMs,
    string? Status);
