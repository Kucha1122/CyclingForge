using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Services;

namespace CyclingForge.Bootstrapper.Composition;

internal sealed class ReadinessDataProvider : IReadinessDataProvider
{
    private const int HrvBaselineWindowDays = 28;

    private readonly IPerformanceManagementService _pmcService;
    private readonly IGarminWellnessRepository _wellnessRepository;
    private readonly IGarminSleepRepository _sleepRepository;
    private readonly IGarminHrvRepository _hrvRepository;
    private readonly IUserRepository _userRepository;

    public ReadinessDataProvider(
        IPerformanceManagementService pmcService,
        IGarminWellnessRepository wellnessRepository,
        IGarminSleepRepository sleepRepository,
        IGarminHrvRepository hrvRepository,
        IUserRepository userRepository)
    {
        _pmcService = pmcService;
        _wellnessRepository = wellnessRepository;
        _sleepRepository = sleepRepository;
        _hrvRepository = hrvRepository;
        _userRepository = userRepository;
    }

    public async Task<ReadinessData> GetReadinessDataAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var data = new ReadinessData();

        float? tsb = null, ctl = null, atl = null;
        bool hasPmc = false;

        try
        {
            var pmcSummary = await _pmcService.GetPmcSummaryAsync(userId);
            tsb = pmcSummary.CurrentTSB;
            ctl = pmcSummary.CurrentCTL;
            atl = pmcSummary.CurrentATL;
            hasPmc = true;
        }
        catch
        {
            // PMC data may not be available
        }

        int? bodyBattery = null, sleepScore = null, trainingReadiness = null, stressLevel = null;
        string? trainingReadinessLevel = null;
        float? vo2Max = null;
        int? hrvLastNight = null, hrvBaseline = null;
        string? hrvStatus = null;
        bool hasGarmin = false;

        try
        {
            var wellness = await _wellnessRepository.GetByUserIdAndDateAsync(userId, date, cancellationToken);
            if (wellness is not null)
            {
                bodyBattery = wellness.BodyBatteryMax;
                trainingReadiness = wellness.TrainingReadinessScore;
                trainingReadinessLevel = wellness.TrainingReadinessLevel;
                stressLevel = wellness.AverageStressLevel;
                vo2Max = wellness.Vo2MaxMlPerMinPerKg;
                hasGarmin = true;
            }

            var sleep = await _sleepRepository.GetByUserIdAndDateAsync(userId, date, cancellationToken);
            if (sleep is not null)
            {
                sleepScore = sleep.SleepScore;
                hasGarmin = true;
            }

            var hrvToday = await _hrvRepository.GetByUserIdAndDateAsync(userId, date, cancellationToken);
            if (hrvToday is not null)
            {
                hrvLastNight = hrvToday.LastNightAvgMs;
                hrvStatus = hrvToday.Status;
                hasGarmin = true;
            }

            // Personal HRV baseline: average of available nightly HRV over a trailing window.
            // HRV is highly individual, so we evaluate today's value relative to this baseline.
            var hrvHistory = await _hrvRepository.GetByUserIdAndDateRangeAsync(
                userId, date.AddDays(-HrvBaselineWindowDays), date, cancellationToken);
            var baselineValues = hrvHistory
                .Where(h => h.LastNightAvgMs.HasValue)
                .Select(h => h.LastNightAvgMs!.Value)
                .ToList();
            if (baselineValues.Count > 0)
                hrvBaseline = (int)Math.Round(baselineValues.Average());
        }
        catch
        {
            // Garmin data may not be available
        }

        int? ftp = null;
        try
        {
            var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
            ftp = user?.FunctionalThresholdPower;
        }
        catch
        {
            // User data may not be available
        }

        return new ReadinessData
        {
            TSB = tsb,
            CTL = ctl,
            ATL = atl,
            BodyBatteryMax = bodyBattery,
            SleepScore = sleepScore,
            TrainingReadinessScore = trainingReadiness,
            TrainingReadinessLevel = trainingReadinessLevel,
            AverageStressLevel = stressLevel,
            HrvLastNightMs = hrvLastNight,
            HrvBaselineMs = hrvBaseline,
            HrvStatus = hrvStatus,
            Vo2Max = vo2Max,
            UserFtp = ftp,
            HasGarminData = hasGarmin,
            HasPmcData = hasPmc
        };
    }
}
