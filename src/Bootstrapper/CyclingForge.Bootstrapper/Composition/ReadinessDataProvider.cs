using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Services;

namespace CyclingForge.Bootstrapper.Composition;

internal sealed class ReadinessDataProvider : IReadinessDataProvider
{
    private readonly IPerformanceManagementService _pmcService;
    private readonly IGarminWellnessRepository _wellnessRepository;
    private readonly IGarminSleepRepository _sleepRepository;
    private readonly IUserRepository _userRepository;

    public ReadinessDataProvider(
        IPerformanceManagementService pmcService,
        IGarminWellnessRepository wellnessRepository,
        IGarminSleepRepository sleepRepository,
        IUserRepository userRepository)
    {
        _pmcService = pmcService;
        _wellnessRepository = wellnessRepository;
        _sleepRepository = sleepRepository;
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
        bool hasGarmin = false;

        try
        {
            var wellness = await _wellnessRepository.GetByUserIdAndDateAsync(userId, date, cancellationToken);
            if (wellness is not null)
            {
                bodyBattery = wellness.BodyBatteryMax;
                trainingReadiness = wellness.TrainingReadinessScore;
                stressLevel = wellness.AverageStressLevel;
                hasGarmin = true;
            }

            var sleep = await _sleepRepository.GetByUserIdAndDateAsync(userId, date, cancellationToken);
            if (sleep is not null)
            {
                sleepScore = sleep.SleepScore;
                hasGarmin = true;
            }
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
            AverageStressLevel = stressLevel,
            UserFtp = ftp,
            HasGarminData = hasGarmin,
            HasPmcData = hasPmc
        };
    }
}
