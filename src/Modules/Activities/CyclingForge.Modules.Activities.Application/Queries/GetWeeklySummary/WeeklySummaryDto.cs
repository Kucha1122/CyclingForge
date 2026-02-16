namespace CyclingForge.Modules.Activities.Application.Queries.GetWeeklySummary;

public sealed record WeeklySummaryDto(
    DateTime WeekStart,
    DateTime WeekEnd,
    int TotalActivities,
    float TotalDistance,
    TimeSpan TotalMovingTime,
    float TotalElevationGain,
    float? TotalTSS,
    float? AveragePower,
    int RideCount,
    int RunCount);
