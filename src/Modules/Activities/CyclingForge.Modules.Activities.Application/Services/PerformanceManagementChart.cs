namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Performance Management Chart data
/// </summary>
public sealed class PerformanceManagementChart
{
    /// <summary>
    /// Chronic Training Load - fitness (42-day exponentially weighted average of TSS)
    /// </summary>
    public float CTL { get; init; }

    /// <summary>
    /// Acute Training Load - fatigue (7-day exponentially weighted average of TSS)
    /// </summary>
    public float ATL { get; init; }

    /// <summary>
    /// Training Stress Balance - form (CTL - ATL)
    /// </summary>
    public float TSB { get; init; }

    /// <summary>
    /// Date for this PMC data point
    /// </summary>
    public DateTime Date { get; init; }

    /// <summary>
    /// Summary of activities contributing to this day's load (for tooltips).
    /// </summary>
    public IReadOnlyList<PmcActivitySummaryDto> Activities { get; init; } = Array.Empty<PmcActivitySummaryDto>();
}

public sealed class PmcActivitySummaryDto
{
    public Guid ActivityId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string SportType { get; init; } = string.Empty;
    public float? TrainingStressScore { get; init; }
    public int MovingTimeSeconds { get; init; }
}

public sealed class PmcSummary
{
    public float CurrentCTL { get; init; }
    public float CurrentATL { get; init; }
    public float CurrentTSB { get; init; }
    public string FormStatus { get; init; } = string.Empty;
    public string Recommendation { get; init; } = string.Empty;
    public List<PerformanceManagementChart> History { get; init; } = new();

    /// <summary>Average CTL over the previous 7 days (today-14 to today-8).</summary>
    public float PreviousWeekAvgCtl { get; init; }

    /// <summary>Average ATL over the previous 7 days (today-14 to today-8).</summary>
    public float PreviousWeekAvgAtl { get; init; }

    /// <summary>Average CTL over the last 7 days including today.</summary>
    public float CurrentWeekAvgCtl { get; init; }

    /// <summary>Average ATL over the last 7 days including today.</summary>
    public float CurrentWeekAvgAtl { get; init; }

    /// <summary>Change in CTL per week (current 7-day avg minus previous 7-day avg).</summary>
    public float RampRateCtlPerWeek { get; init; }

    /// <summary>FTP change events in the history range (manual and eFTP from activities) for chart markers.</summary>
    public List<FtpChangeDto> FtpChanges { get; init; } = new();
}

public sealed class FtpChangeDto
{
    public DateTime Date { get; init; }
    public int FromFtp { get; init; }
    public int ToFtp { get; init; }
    public string Source { get; init; } = string.Empty; // "Manual" | "EstimatedFromActivity"
}

public interface IPerformanceManagementService
{
    /// <summary>
    /// Calculate PMC values for a date range
    /// </summary>
    Task<List<PerformanceManagementChart>> CalculatePmcAsync(Guid userId, DateTime startDate, DateTime endDate, int ctlDays = 42, int atlDays = 7);

    /// <summary>
    /// Get current PMC summary with recommendations
    /// </summary>
    Task<PmcSummary> GetPmcSummaryAsync(Guid userId, int ctlDays = 42, int atlDays = 7, int historyDays = 90);

    /// <summary>
    /// Calculate CTL, ATL, TSB for a specific date
    /// </summary>
    (float ctl, float atl, float tsb) CalculatePmcForDate(List<(DateTime date, float tss)> historicalTss, DateTime targetDate, int ctlDays = 42, int atlDays = 7);
}
