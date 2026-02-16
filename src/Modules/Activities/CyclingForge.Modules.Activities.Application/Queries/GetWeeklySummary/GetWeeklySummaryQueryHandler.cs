using CyclingForge.Modules.Activities.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetWeeklySummary;

internal sealed class GetWeeklySummaryQueryHandler : IRequestHandler<GetWeeklySummaryQuery, WeeklySummaryDto>
{
    private readonly IActivityRepository _activityRepository;

    public GetWeeklySummaryQueryHandler(IActivityRepository activityRepository)
    {
        _activityRepository = activityRepository;
    }

    public async Task<WeeklySummaryDto> Handle(GetWeeklySummaryQuery request, CancellationToken cancellationToken)
    {
        var weekStart = request.WeekStart ?? GetStartOfWeek(DateTime.UtcNow);
        var weekEnd = weekStart.AddDays(7).AddSeconds(-1);

        var activities = await _activityRepository.GetByUserIdAsync(request.UserId, 1, 10000, cancellationToken);
        
        var weekActivities = activities
            .Where(a => a.StartDate >= weekStart && a.StartDate <= weekEnd)
            .ToList();

        var totalDistance = weekActivities.Sum(a => a.Distance.ToKilometers());
        var totalMovingTime = TimeSpan.FromSeconds(weekActivities.Sum(a => a.MovingTime.Seconds));
        var totalElevationGain = weekActivities.Sum(a => a.TotalElevationGain);
        var totalTSS = weekActivities.Where(a => a.TrainingStressScore.HasValue).Sum(a => a.TrainingStressScore!.Value);
        
        var activitiesWithPower = weekActivities.Where(a => a.AveragePower.HasValue).ToList();
        var avgPower = activitiesWithPower.Any() 
            ? activitiesWithPower.Average(a => a.AveragePower!.Value) 
            : (float?)null;

        var rideCount = weekActivities.Count(a => a.Type.Value.Contains("Ride", StringComparison.OrdinalIgnoreCase));
        var runCount = weekActivities.Count(a => a.Type.Value.Contains("Run", StringComparison.OrdinalIgnoreCase));

        return new WeeklySummaryDto(
            weekStart,
            weekEnd,
            weekActivities.Count,
            totalDistance,
            totalMovingTime,
            totalElevationGain,
            totalTSS > 0 ? totalTSS : null,
            avgPower,
            rideCount,
            runCount);
    }

    private static DateTime GetStartOfWeek(DateTime date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-1 * diff).Date;
    }
}
