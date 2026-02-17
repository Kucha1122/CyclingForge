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

    public async Task<PmcSummary> GetPmcSummaryAsync(Guid userId, int ctlDays = 42, int atlDays = 7, int historyDays = 90)
    {
        var cacheKey = BuildCacheKey(userId, ctlDays, atlDays, historyDays);
        if (_cache.TryGetValue<PmcSummary?>(cacheKey, out var cached) && cached is not null)
        {
            return cached;
        }

        var utcNow = DateTime.UtcNow;
        var localNow = DateTime.Now;
        var today = utcNow.Date;
        var historyStartDate = today.AddDays(-historyDays);

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

        // #region agent log - daily metrics snapshot for 4–10 Feb 2026
        try
        {
            var rangeStart = new DateTime(2026, 2, 4);
            var rangeEnd = new DateTime(2026, 2, 10);

            // TSS per day (po uwzględnieniu ActivityLoadCalculator / eFTP)
            var tssByDate = activitiesWithTss
                .GroupBy(x => x.date.Date)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.tss));

            // Liczba aktywności na dzień
            var activitiesByDate = activities
                .GroupBy(a => a.StartDate.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            // CTL / ATL / TSB z historii PMC
            var pmcByDate = history
                .GroupBy(h => h.Date.Date)
                .ToDictionary(g => g.Key, g => g.Last());

            var days = new List<object>();
            for (var d = rangeStart.Date; d <= rangeEnd.Date; d = d.AddDays(1))
            {
                tssByDate.TryGetValue(d, out var tssDay);
                activitiesByDate.TryGetValue(d, out var actCount);
                pmcByDate.TryGetValue(d, out var pmc);

                days.Add(new
                {
                    date = d.ToString("yyyy-MM-dd"),
                    tss = tssDay,
                    ctl = pmc?.CTL ?? 0f,
                    atl = pmc?.ATL ?? 0f,
                    tsb = pmc?.TSB ?? 0f,
                    activityCount = actCount
                });
            }

            var payload = new
            {
                hypothesisId = "H_daily_2026_02_04_10",
                location = "PerformanceManagementService.GetPmcSummaryAsync",
                message = "Daily TSS + PMC metrics snapshot for 2026-02-04..2026-02-10",
                data = new
                {
                    userId,
                    from = rangeStart.ToString("yyyy-MM-dd"),
                    to = rangeEnd.ToString("yyyy-MM-dd"),
                    days
                }
            };

            var json = JsonSerializer.Serialize(payload);
            System.IO.File.AppendAllText(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\metrics-daily-2026-02-04-10.json", json + "\n");
        }
        catch { }
        // #endregion

        // #region agent log - verify "today" / timezone assumptions
        try
        {
            var j = System.Text.Json.JsonSerializer.Serialize(new
            {
                hypothesisId = "H_today",
                location = "PerformanceManagementService.GetPmcSummaryAsync",
                message = "server time + today date selection",
                data = new
                {
                    utcNow,
                    localNow,
                    todayUsed = today,
                    localToday = localNow.Date,
                    tz = TimeZoneInfo.Local.Id
                }
            });
            System.IO.File.AppendAllText(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", j + "\n");
        }
        catch { }
        // #endregion

        // #region agent log - backend PMC range stats (for chart domain debugging)
        try
        {
            var maxCtl = history.Count > 0 ? history.Max(x => x.CTL) : 0f;
            var maxAtl = history.Count > 0 ? history.Max(x => x.ATL) : 0f;
            var maxTsb = history.Count > 0 ? history.Max(x => x.TSB) : 0f;
            var minTsb = history.Count > 0 ? history.Min(x => x.TSB) : 0f;
            var j = System.Text.Json.JsonSerializer.Serialize(new
            {
                hypothesisId = "H_UI1",
                location = "PerformanceManagementService.GetPmcSummaryAsync",
                message = "PMC stats",
                data = new
                {
                    ctlDays,
                    atlDays,
                    historyDays,
                    current = new { ctl, atl, tsb },
                    max = new { ctl = maxCtl, atl = maxAtl, tsb = maxTsb },
                    min = new { tsb = minTsb }
                }
            });
            System.IO.File.AppendAllText(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", j + "\n");
        }
        catch { }
        // #endregion

        // #region agent log - detect perceived "flat" charts (deltas + endpoints)
        try
        {
            float maxAtlDelta = 0, maxCtlDelta = 0;
            string? maxAtlDeltaDate = null, maxCtlDeltaDate = null;
            for (var i = 1; i < history.Count; i++)
            {
                var dAtl = MathF.Abs(history[i].ATL - history[i - 1].ATL);
                if (dAtl > maxAtlDelta) { maxAtlDelta = dAtl; maxAtlDeltaDate = history[i].Date.ToString("yyyy-MM-dd"); }
                var dCtl = MathF.Abs(history[i].CTL - history[i - 1].CTL);
                if (dCtl > maxCtlDelta) { maxCtlDelta = dCtl; maxCtlDeltaDate = history[i].Date.ToString("yyyy-MM-dd"); }
            }
            var first = history.Count > 0 ? history[0] : null;
            var last = history.Count > 0 ? history[^1] : null;
            var j = System.Text.Json.JsonSerializer.Serialize(new
            {
                hypothesisId = "H_UI2",
                location = "PerformanceManagementService.GetPmcSummaryAsync",
                message = "PMC deltas+endpoints",
                data = new
                {
                    count = history.Count,
                    first = first is null ? null : new { first.Date, first.CTL, first.ATL, first.TSB },
                    last = last is null ? null : new { last.Date, last.CTL, last.ATL, last.TSB },
                    maxAtlDelta,
                    maxAtlDeltaDate,
                    maxCtlDelta,
                    maxCtlDeltaDate
                }
            });
            System.IO.File.AppendAllText(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", j + "\n");
        }
        catch { }
        // #endregion

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

        _cache.Set(cacheKey, summary, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15)
        });

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
            // Get FTP for the activity date
            var ftpForDate = await _ftpProvider.GetFtpForDateAsync(userId, activity.StartDate, CancellationToken.None);
            var ftpForTss = ftpForDate.HasValue && manualFtp.HasValue && manualFtp.Value > 0
                ? Math.Max(ftpForDate.Value, manualFtp.Value)
                : ftpForDate ?? manualFtp;

            // Use ActivityLoadCalculator to calculate load with sport-specific adjustments
            // This replaces the old inline logic with hardcoded sport factors
            var load = await _loadCalculator.CalculateLoadAsync(
                activity,
                ftpForTss,
                hrZones,
                CancellationToken.None);

            // #region agent log
            try { var typeVal = activity.Type?.Value ?? "?"; var j = System.Text.Json.JsonSerializer.Serialize(new { hypothesisId = "H4", location = "BuildActivitiesWithTssAsync", message = "activity load", data = new { type = typeVal, load = load.HasValue ? (float?)load.Value : null, storedTss = activity.TrainingStressScore, usedFallback = !load.HasValue && activity.TrainingStressScore.HasValue } }); System.IO.File.AppendAllText(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", j + "\n"); } catch { }
            // #endregion

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

        // #region agent log - last 7 days attribution + endDate cutoff detection
        try
        {
            var end = endDate.Date;
            var start = end.AddDays(-6);
            var perDay = new List<object>();

            // activities that are on endDate (by Date) but excluded due to endDate being midnight
            var cutoffExcludedCount = activities.Count(a => a.StartDate.Date == end && a.StartDate > endDate);
            var cutoffIncludedCount = activities.Count(a => a.StartDate.Date == end && a.StartDate <= endDate);
            var cutoffDayTotal = activities.Count(a => a.StartDate.Date == end);

            // Build a quick lookup of which Strava IDs made it into result
            var resultSet = new HashSet<long>();
            // We don't have activityId in result, so approximate by (date,tss) isn't stable; instead compute stats directly from inRange below.

            for (var d = start; d <= end; d = d.AddDays(1))
            {
                var dayActs = inRange.Where(a => a.StartDate.Date == d).ToList();
                var dayEntries = result.Where(x => x.date.Date == d).ToList();

                var excludedNoLoadOrStored = dayActs.Count(a =>
                {
                    // Excluded means: activity date == d but it didn't contribute any entry in result.
                    // We can detect it by re-running the same decision heuristics cheaply:
                    // if TrainingStressScore is null and we cannot compute load (unknown here) it will be excluded.
                    // We'll approximate exclusion as TrainingStressScore == null AND NormalizedPower == null (no power) AND AverageHeartRate == null.
                    return a.TrainingStressScore is null && a.NormalizedPower is null && a.AverageHeartRate is null;
                });

                var top = dayActs
                    .Select(a => new
                    {
                        stravaId = a.StravaActivityId,
                        type = a.Type?.Value,
                        startDate = a.StartDate,
                        deviceWatts = a.DeviceWatts,
                        np = a.NormalizedPower,
                        avgPower = a.AveragePower,
                        avgHr = a.AverageHeartRate,
                        storedTss = a.TrainingStressScore
                    })
                    .OrderByDescending(x => x.storedTss ?? 0)
                    .Take(3)
                    .ToList();

                perDay.Add(new
                {
                    date = d.ToString("yyyy-MM-dd"),
                    activityCount = dayActs.Count,
                    contributedEntries = dayEntries.Count,
                    totalLoadUsed = dayEntries.Sum(x => x.tss),
                    excludedNoLoadOrStoredApprox = excludedNoLoadOrStored,
                    top
                });
            }

            var j = System.Text.Json.JsonSerializer.Serialize(new
            {
                hypothesisId = "H_last7",
                location = "BuildActivitiesWithTssAsync",
                message = "last 7 days totals + endDate cutoff",
                data = new
                {
                    endDate,
                    endDateDate = end,
                    cutoff = new { cutoffDayTotal, cutoffIncludedCount, cutoffExcludedCount },
                    perDay
                }
            });
            System.IO.File.AppendAllText(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", j + "\n");
        }
        catch { }
        // #endregion

        // #region agent log - confirm multiple activities per day are summed
        try
        {
            var byDay = result.GroupBy(x => x.date).Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count(), total = g.Sum(x => x.tss) }).OrderByDescending(x => x.total).Take(5).ToList();
            var j = System.Text.Json.JsonSerializer.Serialize(new { hypothesisId = "H_multi", location = "BuildActivitiesWithTssAsync", message = "per-day activity count and sum", data = new { totalActivityEntries = result.Count, sampleDays = byDay } });
            System.IO.File.AppendAllText(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", j + "\n");
        }
        catch { }
        // #endregion

        // #region agent log - investigate \"flat\" perception (recent daily totals + suspicious power flags)
        try
        {
            var lastDate = result.Count > 0 ? result.Max(x => x.date) : (DateTime?)null;
            var recent = new List<object>();
            if (lastDate.HasValue)
            {
                var start = lastDate.Value.AddDays(-13);
                var grouped = result.GroupBy(x => x.date).ToDictionary(g => g.Key, g => new { count = g.Count(), total = g.Sum(x => x.tss) });
                for (var d = start.Date; d <= lastDate.Value.Date; d = d.AddDays(1))
                {
                    if (grouped.TryGetValue(d, out var v))
                        recent.Add(new { date = d.ToString("yyyy-MM-dd"), v.count, v.total });
                    else
                        recent.Add(new { date = d.ToString("yyyy-MM-dd"), count = 0, total = 0f });
                }
            }

            var suspiciousPower = activities
                .Where(a => a.StartDate >= lookbackDate && a.StartDate <= endDate)
                .Count(a =>
                    (a.Type.Value.Contains("Ride", StringComparison.OrdinalIgnoreCase)) &&
                    a.NormalizedPower.HasValue &&
                    a.DeviceWatts != true);

            var j = System.Text.Json.JsonSerializer.Serialize(new
            {
                hypothesisId = "H_shape",
                location = "BuildActivitiesWithTssAsync",
                message = "recent daily totals + suspicious power flags",
                data = new
                {
                    recentDays = recent,
                    suspiciousRideWithNPButNotDeviceWattsTrue = suspiciousPower
                }
            });
            System.IO.File.AppendAllText(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", j + "\n");
        }
        catch { }
        // #endregion

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
