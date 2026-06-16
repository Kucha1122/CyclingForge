using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetRealizedWeek;

public sealed record GetRealizedWeekQuery(Guid UserId, DateOnly WeekStart) : IRequest<RealizedWeekDto>;

public sealed record RealizedWeekDto(
    DateOnly WeekStart,
    DateOnly WeekEnd,
    IReadOnlyList<RealizedDayDto> Days,
    IReadOnlyList<int> WeeklyHrZoneSeconds);

public sealed record RealizedDayDto(
    DateOnly Date,
    IReadOnlyList<RealizedActivityDto> Activities,
    IReadOnlyList<int> DailyHrZoneSeconds);

public sealed record RealizedActivityDto(
    Guid Id,
    long StravaActivityId,
    string Name,
    string Type,
    DateTime StartDate,
    double DistanceKm,
    int DurationSeconds,
    float? TrainingStressScore,
    float? AverageHeartRate,
    IReadOnlyList<int> HrZoneSeconds);
