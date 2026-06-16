using System.Text.Json;
using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Activities.Domain.ValueObjects;
using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Commands.SyncActivities;

internal sealed class SyncActivitiesCommandHandler : IRequestHandler<SyncActivitiesCommand, int>
{
    private const int TwentyMinutesSeconds = 1200;

    private readonly IActivityRepository _activityRepository;
    private readonly IStravaActivitiesService _stravaService;
    private readonly IUserFtpProvider _ftpProvider;
    private readonly IUserLthrProvider _lthrProvider;
    private readonly ITrainingMetricsCalculator _metricsCalculator;
    private readonly IActivityLoadCalculator _loadCalculator;
    private readonly IPowerProfileAnalyzer _powerProfileAnalyzer;
    private readonly IEftpEstimator _eftpEstimator;
    private readonly IClock _clock;

    public SyncActivitiesCommandHandler(
        IActivityRepository activityRepository,
        IStravaActivitiesService stravaService,
        IUserFtpProvider ftpProvider,
        IUserLthrProvider lthrProvider,
        ITrainingMetricsCalculator metricsCalculator,
        IActivityLoadCalculator loadCalculator,
        IPowerProfileAnalyzer powerProfileAnalyzer,
        IEftpEstimator eftpEstimator,
        IClock clock)
    {
        _activityRepository = activityRepository;
        _stravaService = stravaService;
        _ftpProvider = ftpProvider;
        _lthrProvider = lthrProvider;
        _metricsCalculator = metricsCalculator;
        _loadCalculator = loadCalculator;
        _powerProfileAnalyzer = powerProfileAnalyzer;
        _eftpEstimator = eftpEstimator;
        _clock = clock;
    }

    public async Task<int> Handle(SyncActivitiesCommand request, CancellationToken cancellationToken)
    {
        DateTime? afterUtc = null;
        DateTime? beforeUtc = null;
        if (request.QuickSync)
        {
            var latestStart = await _activityRepository.GetLatestActivityStartDateAsync(request.UserId, cancellationToken);
            if (latestStart.HasValue)
            {
                var todayEnd = _clock.CurrentDate().Date.AddDays(1);
                // Cofamy okno o 1 dzień (overlap), żeby nie zgubić aktywności dodanych
                // z opóźnieniem lub edytowanych. Dedup po StravaId chroni przed duplikatami.
                afterUtc = latestStart.Value.AddDays(-1);
                beforeUtc = todayEnd;
            }
        }

        // A forced recompute rebuilds the eFTP timeline from scratch: clear previously estimated
        // changes first so the monotonic "eFTP can only increase vs previous eFTP" rule does not
        // pin the timeline to stale values computed by the old estimator. Manual changes are kept.
        if (request.ForceRecompute)
            await _ftpProvider.ClearEstimatedFtpChangesAsync(request.UserId, cancellationToken);

        var stravaActivities = await _stravaService.FetchActivitiesAsync(request.UserId, afterUtc, beforeUtc, cancellationToken);
        var userLthr = await _lthrProvider.GetLthrAsync(request.UserId, cancellationToken);
        var syncedCount = 0;
        var now = _clock.CurrentDate();

        // Przetwarzaj aktywności od najstarszej do najnowszej, żeby eFTP timeline
        // był budowany w poprawnej kolejności (starsze wpisy w UserFtpChanges powstają jako pierwsze).
        foreach (var stravaActivity in stravaActivities.OrderBy(a => a.StartDate))
        {
            var existingActivity = await _activityRepository
                .GetByStravaIdAsync(stravaActivity.StravaId, request.UserId, cancellationToken);

            // When API doesn't return device_watts but we have power, assume estimated (false) so PMC uses HRSS
            var deviceWatts = stravaActivity.DeviceWatts
                ?? (stravaActivity.AveragePower.HasValue ? false : (bool?)null)
                ?? (existingActivity is { } ex && (ex.NormalizedPower.HasValue || ex.AveragePower.HasValue) ? false : (bool?)null);

            if (existingActivity is not null)
            {
                existingActivity.Update(
                    stravaActivity.Name,
                    new Distance(stravaActivity.Distance),
                    new Duration(stravaActivity.MovingTime),
                    new Duration(stravaActivity.ElapsedTime),
                    stravaActivity.TotalElevationGain,
                    stravaActivity.AverageSpeed,
                    stravaActivity.MaxSpeed,
                    stravaActivity.AverageHeartRate,
                    stravaActivity.MaxHeartRate,
                    stravaActivity.AveragePower,
                    now,
                    deviceWatts);

                await ApplyTssIfPossibleAsync(request.UserId, existingActivity, stravaActivity, userLthr, request.ForceRecompute, cancellationToken);
                await _activityRepository.UpdateAsync(existingActivity, cancellationToken);
            }
            else
            {
                var activity = Activity.Create(
                    request.UserId,
                    stravaActivity.StravaId,
                    stravaActivity.Name,
                    ActivityType.FromString(stravaActivity.Type),
                    stravaActivity.StartDate,
                    new Distance(stravaActivity.Distance),
                    new Duration(stravaActivity.MovingTime),
                    new Duration(stravaActivity.ElapsedTime),
                    stravaActivity.TotalElevationGain,
                    stravaActivity.AverageSpeed,
                    stravaActivity.MaxSpeed,
                    stravaActivity.AverageHeartRate,
                    stravaActivity.MaxHeartRate,
                    stravaActivity.AveragePower,
                    now,
                    deviceWatts);

                await ApplyTssIfPossibleAsync(request.UserId, activity, stravaActivity, userLthr, request.ForceRecompute, cancellationToken);
                await _activityRepository.AddAsync(activity, cancellationToken);
                syncedCount++;
            }
        }

        return syncedCount;
    }

    private async Task ApplyTssIfPossibleAsync(Guid userId, Activity activity, StravaActivityDto dto, int? userLthr, bool forceRecompute, CancellationToken cancellationToken)
    {
        List<float>? powerData = null;
        if (!string.IsNullOrEmpty(dto.StreamsJson) && TryParseWattsFromStreams(dto.StreamsJson, out var parsed))
            powerData = parsed;

        // When activity already has fully computed power-based metrics (NP, TSS, FTP used),
        // avoid recomputing them on subsequent sync runs to keep persisted values stable.
        // Still fix MaxPower from power stream when available (it may have been stored wrong as average before).
        // A forced recompute bypasses this short-circuit so eFTP and TSS are re-derived with the
        // current estimator and FTP timeline.
        if (!forceRecompute &&
            activity.TrainingStressScore.HasValue &&
            activity.NormalizedPower.HasValue &&
            activity.FtpUsed.HasValue)
        {
            if (powerData != null && powerData.Count > 0)
            {
                float? maxPower = (float)powerData.Max();
                activity.UpdateMetrics(
                    maxPower: maxPower,
                    normalizedPower: activity.NormalizedPower,
                    intensityFactor: activity.IntensityFactor,
                    trainingStressScore: activity.TrainingStressScore,
                    ftpUsed: activity.FtpUsed,
                    best20MinPower: activity.Best20MinPower,
                    best5MinPower: activity.Best5MinPower,
                    best60MinPower: activity.Best60MinPower,
                    estimatedFtpFromActivity: activity.EstimatedFtpFromActivity);
            }
            return;
        }

        float? best20Min = null;
        float? best5Min = null;
        float? best60Min = null;
        int? estimatedFtpFromActivity = null;
        if (powerData != null && powerData.Count >= 300)
        {
            var profile = _powerProfileAnalyzer.AnalyzePowerProfile(powerData, null);
            best20Min = profile.TwentyMinutePower;
            best5Min = profile.FiveMinutePower;
            best60Min = profile.OneHourPower;
            var minDuration = await _ftpProvider.GetEftpMinDurationSecondsAsync(userId, cancellationToken);
            var eftp = _eftpEstimator.EstimateFtpFromPowerProfile(profile, minDuration);
            if (eftp.HasValue && eftp.Value > 0)
            {
                estimatedFtpFromActivity = (int)Math.Round(eftp.Value);
                // Persist significant eFTP updates on the FTP timeline so that calendar FTP
                // and activity FTP use only UserFtpChanges (Manual + EstimatedFromActivity).
                await _ftpProvider.RegisterEftpChangeIfNeededAsync(userId, dto.StartDate, estimatedFtpFromActivity.Value, cancellationToken);
            }
        }
        else if (activity.Best5MinPower.HasValue || activity.Best20MinPower.HasValue || activity.Best60MinPower.HasValue)
        {
            // No streams in this fetch (typical for a bulk re-sync), but the activity already has
            // mean-maximal power stored from its original import. Re-estimate eFTP from those stored
            // bests so a forced recompute can rebuild the FTP timeline (incl. ramp-test bumps) without
            // re-downloading every stream from Strava.
            var profile = new PowerProfile
            {
                FiveMinutePower = activity.Best5MinPower,
                TwentyMinutePower = activity.Best20MinPower,
                OneHourPower = activity.Best60MinPower
            };
            var minDuration = await _ftpProvider.GetEftpMinDurationSecondsAsync(userId, cancellationToken);
            var eftp = _eftpEstimator.EstimateFtpFromPowerProfile(profile, minDuration);
            if (eftp.HasValue && eftp.Value > 0)
            {
                estimatedFtpFromActivity = (int)Math.Round(eftp.Value);
                await _ftpProvider.RegisterEftpChangeIfNeededAsync(userId, dto.StartDate, estimatedFtpFromActivity.Value, cancellationToken);
            }
        }

        var ftpForDate = await _ftpProvider.GetFtpForDateAsync(userId, dto.StartDate, cancellationToken);
        var manualFtp = await _ftpProvider.GetFtpAsync(userId, cancellationToken);
        // Use calendar FTP for the activity date when available; fall back to current manual FTP only when no timeline value exists.
        var ftpForTss = ftpForDate ?? manualFtp;

        if (ftpForTss.HasValue && ftpForTss.Value > 0)
        {
            float? np = null;
            if (powerData != null && powerData.Count > 0)
                np = _metricsCalculator.CalculateNormalizedPower(powerData);
            // No fresh stream (e.g. a forced recompute without re-downloading streams): keep the
            // Normalized Power computed at the original import rather than degrading it to average power.
            if (!np.HasValue && activity.NormalizedPower.HasValue && activity.NormalizedPower.Value > 0)
                np = activity.NormalizedPower.Value;
            if (!np.HasValue && dto.AveragePower.HasValue && dto.AveragePower.Value > 0)
                np = (float)dto.AveragePower.Value;

            if (np.HasValue)
            {
                var if_ = _metricsCalculator.CalculateIntensityFactor(np, ftpForTss);
                if (if_.HasValue)
                {
                    var tss = _metricsCalculator.CalculateTrainingStressScore(np, if_, dto.MovingTime, ftpForTss);
                    if (tss.HasValue)
                    {
                        // MaxPower = max from power stream when available; otherwise null (do not use average as max).
                        float? maxPower = powerData != null && powerData.Count > 0 ? (float)powerData.Max() : null;
                        activity.UpdateMetrics(
                            maxPower: maxPower,
                            normalizedPower: np.Value,
                            intensityFactor: if_.Value,
                            trainingStressScore: tss,
                            ftpUsed: ftpForTss,
                            best20MinPower: best20Min ?? activity.Best20MinPower,
                            best5MinPower: best5Min ?? activity.Best5MinPower,
                            best60MinPower: best60Min ?? activity.Best60MinPower,
                            estimatedFtpFromActivity: estimatedFtpFromActivity ?? activity.EstimatedFtpFromActivity);
                        return;
                    }
                }
            }
        }

        // Use HR-based TSS for activities without power; apply sport factor so stored value matches Intervals.icu Load.
        // Preserve existing power profile when dto has no streams (do not overwrite with null and lose eFTP dots).
        if (dto.AverageHeartRate.HasValue && userLthr.HasValue && userLthr.Value > 0)
        {
            var durationMinutes = dto.MovingTime / 60.0;
            var hrRatio = dto.AverageHeartRate.Value / (float)userLthr.Value;
            var rawTss = (float)(durationMinutes * hrRatio * hrRatio * 100 / 60);
            var sportFactor = _loadCalculator.GetSportFactorMultiplier(dto.Type);
            var storedTss = rawTss * sportFactor;

            activity.UpdateMetrics(
                maxPower: null,
                normalizedPower: null,
                intensityFactor: null,
                trainingStressScore: storedTss,
                ftpUsed: null,
                best20MinPower: best20Min ?? activity.Best20MinPower,
                best5MinPower: best5Min ?? activity.Best5MinPower,
                best60MinPower: best60Min ?? activity.Best60MinPower,
                estimatedFtpFromActivity: estimatedFtpFromActivity ?? activity.EstimatedFtpFromActivity);
        }
    }

    private static bool TryParseWattsFromStreams(string streamsJson, out List<float> powerData)
    {
        powerData = new List<float>();
        try
        {
            using var doc = JsonDocument.Parse(streamsJson);
            foreach (var element in doc.RootElement.EnumerateArray())
            {
                if (element.TryGetProperty("type", out var typeEl) && typeEl.GetString() == "watts"
                    && element.TryGetProperty("data", out var dataEl))
                {
                    foreach (var item in dataEl.EnumerateArray())
                    {
                        if (item.ValueKind == JsonValueKind.Number && item.TryGetSingle(out var value))
                            powerData.Add(value);
                    }
                    return powerData.Count > 0;
                }
            }
        }
        catch
        {
            // ignore
        }
        return false;
    }
}

public interface IStravaActivitiesService
{
    Task<IReadOnlyList<StravaActivityDto>> FetchActivitiesAsync(Guid userId, DateTime? afterUtc = null, DateTime? beforeUtc = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns time-in-HR-zone breakdowns (seconds per zone) keyed by Strava activity id for the
    /// user's activities in [afterUtc, beforeUtc). Empty list when the user has no Strava data.
    /// </summary>
    Task<IReadOnlyList<HrZoneBreakdownDto>> GetHrTimeInZonesAsync(Guid userId, DateTime afterUtc, DateTime beforeUtc, CancellationToken cancellationToken = default);
}

public sealed record HrZoneBreakdownDto(
    long StravaId,
    IReadOnlyList<int> SecondsPerZone);

public sealed record StravaActivityDto(
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
    float? AveragePower,
    bool? DeviceWatts,
    string? StreamsJson = null);
