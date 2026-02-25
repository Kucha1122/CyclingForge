using System.Text.Json;
using CyclingForge.Modules.Activities.Domain.Repositories;
using Microsoft.Extensions.Caching.Memory;

namespace CyclingForge.Modules.Activities.Application.Services;

internal sealed class PerformanceManagementService : IPerformanceManagementService
{
    private readonly IActivityRepository _activityRepository;
    private readonly IUserFtpProvider _ftpProvider;
    private readonly IActivityLoadCalculator _loadCalculator;
    private readonly IMemoryCache _cache;

    public PerformanceManagementService(
        IActivityRepository activityRepository,
        IUserFtpProvider ftpProvider,
        IActivityLoadCalculator loadCalculator,
        IMemoryCache cache)
    {
        _activityRepository = activityRepository;
        _ftpProvider = ftpProvider;
        _loadCalculator = loadCalculator;
        _cache = cache;
    }

    public async Task<List<PerformanceManagementChart>> CalculatePmcAsync(Guid userId, DateTime startDate, DateTime endDate, int ctlDays = 42, int atlDays = 7)
    {
        // Need sufficient history for CTL warm-up (exponential has long tail)
        var lookbackDays = Math.Max(ctlDays * 2, 120);
        var lookbackDate = startDate.AddDays(-lookbackDays);
        var activities = await _activityRepository.GetByUserIdAndDateRangeAsync(userId, lookbackDate, endDate, CancellationToken.None);

        var activitiesWithTss = await BuildActivitiesWithTssAsync(userId, activities, lookbackDate, endDate);

        return CalculatePmcHistory(activitiesWithTss, startDate, endDate, ctlDays, atlDays);
    }

    public async Task<List<(DateTime date, float tss)>> GetDailyLoadAsync(Guid userId, DateTime startDate, DateTime endDate)
    {
        // For daily load we don't need long warm-up, but we still want to respect
        // the same load calculation rules (power vs HRSS, sport factors, FTP timeline).
        var activities = await _activityRepository.GetByUserIdAndDateRangeAsync(userId, startDate, endDate, CancellationToken.None);
        var activitiesWithTss = await BuildActivitiesWithTssAsync(userId, activities, startDate, endDate);
        return activitiesWithTss;
    }

    public async Task<PmcSummary> GetPmcSummaryAsync(Guid userId, int ctlDays = 42, int atlDays = 7, int historyDays = 90)
    {
        var today = DateTime.UtcNow.Date;
        var historyStartDate = today.AddDays(-historyDays);
        // Cache disabled: always compute PMC fresh so that charts reflect latest sync (FTP/eFTP/TSS).

        var utcNow = DateTime.UtcNow;
        var localNow = DateTime.Now;

        // We need enough warm-up *before* the start of the requested history range,
        // otherwise CTL/ATL will stay at zero for the early part of the chart instead
        // of reflecting long-term load.
        var warmupDays = Math.Max(ctlDays * 2, 120);
        var lookbackDate = historyStartDate.AddDays(-warmupDays);

        var activities = await _activityRepository.GetByUserIdAndDateRangeAsync(userId, lookbackDate, today, CancellationToken.None);
        var activitiesWithTss = await BuildActivitiesWithTssAsync(userId, activities, lookbackDate, today);

        var (ctl, atl, tsb) = CalculatePmcForDate(activitiesWithTss, today, ctlDays, atlDays);

        var activitiesForHistory = activities
            .Where(a => a.StartDate.Date >= historyStartDate && a.StartDate.Date <= today)
            .GroupBy(a => a.StartDate.Date)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<PmcActivitySummaryDto>)g
                    .Select(a => new PmcActivitySummaryDto
                    {
                        ActivityId = a.Id.Value,
                        Name = a.Name,
                        SportType = a.Type.Value,
                        TrainingStressScore = a.TrainingStressScore,
                        MovingTimeSeconds = a.MovingTime.Seconds
                    })
                    .ToList());

        var history = CalculatePmcHistory(activitiesWithTss, historyStartDate, today, ctlDays, atlDays, activitiesForHistory);
        var ftpChanges = await _ftpProvider.GetFtpChangesForRangeAsync(userId, historyStartDate, today, CancellationToken.None);

        var formStatus = DetermineFormStatus(tsb);

        float previousWeekAvgCtl = 0, previousWeekAvgAtl = 0, currentWeekAvgCtl = 0, currentWeekAvgAtl = 0;
        if (history.Count >= 14)
        {
            var previousWeek = history.Skip(history.Count - 14).Take(7).ToList();
            var currentWeek = history.Skip(history.Count - 7).ToList();
            previousWeekAvgCtl = previousWeek.Average(p => p.CTL);
            previousWeekAvgAtl = previousWeek.Average(p => p.ATL);
            currentWeekAvgCtl = currentWeek.Average(p => p.CTL);
            currentWeekAvgAtl = currentWeek.Average(p => p.ATL);
        }
        var rampRateCtlPerWeek = currentWeekAvgCtl - previousWeekAvgCtl;
        var recommendation = GetRecommendation(tsb, atl, ctl, rampRateCtlPerWeek);

        var summary = new PmcSummary
        {
            CurrentCTL = ctl,
            CurrentATL = atl,
            CurrentTSB = tsb,
            FormStatus = formStatus,
            Recommendation = recommendation,
            History = history,
            FtpChanges = ftpChanges.ToList(),
            PreviousWeekAvgCtl = previousWeekAvgCtl,
            PreviousWeekAvgAtl = previousWeekAvgAtl,
            CurrentWeekAvgCtl = currentWeekAvgCtl,
            CurrentWeekAvgAtl = currentWeekAvgAtl,
            RampRateCtlPerWeek = rampRateCtlPerWeek
        };

        return summary;
    }

    private static string BuildCacheKey(Guid userId, int ctlDays, int atlDays, int historyDays) =>
        $"pmc:{userId}:{ctlDays}:{atlDays}:{historyDays}";

    public (float ctl, float atl, float tsb) CalculatePmcForDate(List<(DateTime date, float tss)> historicalTss, DateTime targetDate, int ctlDays = 42, int atlDays = 7)
    {
        float ctl = 0;
        float atl = 0;

        var relevantData = historicalTss.Where(x => x.date <= targetDate).ToList();
        
        if (!relevantData.Any())
            return (0, 0, 0);

        // Start from first activity date (or ctlDays before target if no older data) to properly
        // accumulate CTL/ATL from full history. Interval.icu and TrainingPeaks do the same –
        // otherwise we'd undercount CTL and TSB would be too negative.
        var firstDate = relevantData.Min(x => x.date);
        var startDate = firstDate < targetDate.AddDays(-ctlDays)
            ? firstDate
            : targetDate.AddDays(-ctlDays);

        // EWMA per Science to Sport (https://www.sciencetosport.com/monitoring-training-load/):
        // ATL = ATL_yesterday * e^(-1/k) + TSS_today * (1 - e^(-1/k)), k=7 (zmęczenie = średnia z ostatnich 7 dni).
        // CTL = CTL_yesterday * e^(-1/k) + TSS_today * (1 - e^(-1/k)), k=42 (wytrenowanie = średnia z ostatnich 42 dni).
        // TSB = CTL - ATL (forma = wytrenowanie minus zmęczenie; Science to Sport, Joe Friel, intervals.icu).
        var ctlFactor = 1f - MathF.Exp(-1f / ctlDays);
        var atlFactor = 1f - MathF.Exp(-1f / atlDays);

        for (var date = startDate; date <= targetDate; date = date.AddDays(1))
        {
            var dailyTss = relevantData.Where(x => x.date == date).Sum(x => x.tss);

            ctl = ctl + (dailyTss - ctl) * ctlFactor;
            atl = atl + (dailyTss - atl) * atlFactor;
        }

        var tsb = ctl - atl;

        return (ctl, atl, tsb);
    }

    private List<PerformanceManagementChart> CalculatePmcHistory(
        List<(DateTime date, float tss)> historicalTss,
        DateTime startDate,
        DateTime endDate,
        int ctlDays,
        int atlDays,
        IReadOnlyDictionary<DateTime, IReadOnlyList<PmcActivitySummaryDto>>? activitiesByDate = null)
    {
        var result = new List<PerformanceManagementChart>();

        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
        {
            var (ctl, atl, tsb) = CalculatePmcForDate(historicalTss, date, ctlDays, atlDays);

            result.Add(new PerformanceManagementChart
            {
                Date = date,
                CTL = ctl,
                ATL = atl,
                TSB = tsb,
                Activities = activitiesByDate is not null && activitiesByDate.TryGetValue(date, out var list)
                    ? list
                    : Array.Empty<PmcActivitySummaryDto>()
            });
        }

        return result;
    }

    private async Task<List<(DateTime date, float tss)>> BuildActivitiesWithTssAsync(
        Guid userId,
        IReadOnlyList<Domain.Entities.Activity> activities,
        DateTime lookbackDate,
        DateTime endDate)
    {
        var result = new List<(DateTime date, float tss)>();
        var inRange = activities
            .Where(a => a.StartDate >= lookbackDate && a.StartDate <= endDate)
            .OrderBy(a => a.StartDate)
            .ToList();

        var manualFtp = await _ftpProvider.GetFtpAsync(userId, CancellationToken.None);
        var hrZones = await _ftpProvider.GetHeartRateZonesAsync(userId, CancellationToken.None);

        foreach (var activity in inRange)
        {
            // Get FTP for the activity date; fall back to current manual FTP only when timeline is empty.
            var ftpForDate = await _ftpProvider.GetFtpForDateAsync(userId, activity.StartDate, CancellationToken.None);
            var ftpForTss = ftpForDate ?? manualFtp;

            // Use ActivityLoadCalculator to calculate load with sport-specific adjustments
            // This replaces the old inline logic with hardcoded sport factors
            var load = await _loadCalculator.CalculateLoadAsync(
                activity,
                ftpForTss,
                hrZones,
                CancellationToken.None);

            if (load.HasValue)
            {
                result.Add((activity.StartDate.Date, load.Value));
            }
            else if (activity.TrainingStressScore.HasValue)
            {
                // Fallback: use stored TSS if load calculation failed
                result.Add((activity.StartDate.Date, activity.TrainingStressScore.Value));
            }
        }

        return result;
    }

    // Strefy zgodne z interval.icu: Optymalna = -10 do -35 (budowanie formy)
    private static string DetermineFormStatus(float tsb)
    {
        return tsb switch
        {
            < -35 => "Ryzykowna",
            < -10 => "Optymalna",
            < 5 => "Przejściowa",
            < 25 => "Świeża",
            _ => "Bardzo świeża"
        };
    }

    private const float RampRateWarningThreshold = 7f;

    private static string GetRecommendation(float tsb, float atl, float ctl, float rampRateCtlPerWeek)
    {
        var baseRecommendation = GetBaseRecommendation(tsb, atl, ctl);
        if (rampRateCtlPerWeek > RampRateWarningThreshold)
            return baseRecommendation + " Load is rising quickly – pay attention to recovery.";
        return baseRecommendation;
    }

    private static string GetBaseRecommendation(float tsb, float atl, float ctl)
    {
        if (tsb < -35)
            return "Ryzyko przetrenowania. Zrób dzień odpoczynku lub bardzo lekki trening.";
        if (tsb >= -35 && tsb < -10)
            return "Optymalna strefa treningowa. Dobry czas na budowanie formy.";
        if (tsb >= -10 && tsb < 5)
            return "Strefa przejściowa. Możesz trenować umiarkowanie.";
        if (tsb >= 5 && tsb < 25)
            return "Świeżość w normie. Dobre okno na intensywne jednostki lub start.";
        if (tsb >= 25)
            return ctl < 50
                ? "Buduj wolumen treningowy stopniowo."
                : "Bardzo świeży – rozważ zwiększenie obciążenia, by nie tracić formy.";
        return "Utrzymuj aktualną równowagę treningową.";
    }
}
