namespace CyclingForge.Modules.Activities.Application.Queries.GetMonthlySummary;

public sealed record MonthlySummaryDto(
    int Year,
    int Month,
    int TotalActivities,
    float TotalDistance,
    TimeSpan TotalMovingTime,
    float TotalElevationGain,
    float? TotalTSS,
    float? AverageCTL,
    int RideCount,
    int RunCount);
