using System.Text.Json;
using CyclingForge.Modules.Activities.Domain.Repositories;

namespace CyclingForge.Modules.Activities.Application.Services;

internal sealed class PerformanceManagementService : IPerformanceManagementService
{
    private readonly IActivityRepository _activityRepository;
    private readonly IUserFtpProvider _ftpProvider;

    public PerformanceManagementService(IActivityRepository activityRepository, IUserFtpProvider ftpProvider)
    {
        _activityRepository = activityRepository;
        _ftpProvider = ftpProvider;
    }

    public async Task<List<PerformanceManagementChart>> CalculatePmcAsync(Guid userId, DateTime startDate, DateTime endDate, int ctlDays = 42, int atlDays = 7)
    {
        // Need sufficient history for CTL warm-up (exponential has long tail)
        var lookbackDays = Math.Max(ctlDays * 2, 120);
        var lookbackDate = startDate.AddDays(-lookbackDays);
        var activities = await _activityRepository.GetByUserIdAsync(userId, 1, 10000, CancellationToken.None);
        
        var activitiesWithTss = activities
            .Where(a => a.TrainingStressScore.HasValue && a.StartDate >= lookbackDate && a.StartDate <= endDate)
            .Select(a => (date: a.StartDate.Date, tss: a.TrainingStressScore!.Value))
            .OrderBy(a => a.date)
            .ToList();

        var result = new List<PerformanceManagementChart>();
        
        // Calculate PMC for each day in the range
        for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
        {
            var (ctl, atl, tsb) = CalculatePmcForDate(activitiesWithTss, date, ctlDays, atlDays);
            
            result.Add(new PerformanceManagementChart
            {
                Date = date,
                CTL = ctl,
                ATL = atl,
                TSB = tsb
            });
        }

        return result;
    }

    public async Task<PmcSummary> GetPmcSummaryAsync(Guid userId, int ctlDays = 42, int atlDays = 7, int historyDays = 90)
    {
        var today = DateTime.UtcNow.Date;
        var lookbackDays = Math.Max(ctlDays * 2, 120);
        var lookbackDate = today.AddDays(-lookbackDays);
        
        var activities = await _activityRepository.GetByUserIdAsync(userId, 1, 10000, CancellationToken.None);
        
        var activitiesWithTss = activities
            .Where(a => a.TrainingStressScore.HasValue && a.StartDate >= lookbackDate)
            .Select(a => (date: a.StartDate.Date, tss: a.TrainingStressScore!.Value))
            .OrderBy(a => a.date)
            .ToList();

        var (ctl, atl, tsb) = CalculatePmcForDate(activitiesWithTss, today, ctlDays, atlDays);

        // #region agent log
        try
        {
            var userFtp = await _ftpProvider.GetFtpAsync(userId, CancellationToken.None);
            var sampleFirst = activitiesWithTss.Take(5).Select(a => new { date = a.date.ToString("yyyy-MM-dd"), tss = a.tss }).ToList();
            var sampleLast = activitiesWithTss.Skip(Math.Max(0, activitiesWithTss.Count - 5)).Select(a => new { date = a.date.ToString("yyyy-MM-dd"), tss = a.tss }).ToList();
            var totalTss = activitiesWithTss.Sum(a => a.tss);
            var payload = new
            {
                id = "log_pmc_" + Guid.NewGuid().ToString("N")[..8],
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                location = "PerformanceManagementService.cs:GetPmcSummaryAsync",
                message = "PMC summary",
                data = new
                {
                    userId = userId.ToString(),
                    userFtp,
                    activitiesCount = activitiesWithTss.Count,
                    lookbackDate = lookbackDate.ToString("yyyy-MM-dd"),
                    today = today.ToString("yyyy-MM-dd"),
                    ctlDays,
                    atlDays,
                    ctl,
                    atl,
                    tsb,
                    totalTss,
                    sampleFirst,
                    sampleLast
                },
                hypothesisId = "H1"
            };
            var baseDir = AppContext.BaseDirectory;
            for (var i = 0; i < 6 && !string.IsNullOrEmpty(baseDir); i++) baseDir = Path.GetDirectoryName(baseDir);
            var logPath = Path.Combine(baseDir ?? ".", ".cursor", "debug.log");
            var logDir = Path.GetDirectoryName(logPath);
            if (!string.IsNullOrEmpty(logDir))
            {
                try { Directory.CreateDirectory(logDir); } catch { }
                await File.AppendAllTextAsync(logPath, JsonSerializer.Serialize(payload) + "\n");
            }
        }
        catch { /* ignore */ }
        // #endregion

        var historyStartDate = today.AddDays(-historyDays);
        var history = await CalculatePmcAsync(userId, historyStartDate, today, ctlDays, atlDays);

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

        return new PmcSummary
        {
            CurrentCTL = ctl,
            CurrentATL = atl,
            CurrentTSB = tsb,
            FormStatus = formStatus,
            Recommendation = recommendation,
            History = history,
            PreviousWeekAvgCtl = previousWeekAvgCtl,
            PreviousWeekAvgAtl = previousWeekAvgAtl,
            CurrentWeekAvgCtl = currentWeekAvgCtl,
            CurrentWeekAvgAtl = currentWeekAvgAtl,
            RampRateCtlPerWeek = rampRateCtlPerWeek
        };
    }

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
