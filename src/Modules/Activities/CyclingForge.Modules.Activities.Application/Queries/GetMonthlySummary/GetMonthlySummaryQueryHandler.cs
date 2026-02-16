using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Activities.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetMonthlySummary;

internal sealed class GetMonthlySummaryQueryHandler : IRequestHandler<GetMonthlySummaryQuery, MonthlySummaryDto>
{
    private readonly IActivityRepository _activityRepository;
    private readonly IPerformanceManagementService _pmcService;

    public GetMonthlySummaryQueryHandler(
        IActivityRepository activityRepository,
        IPerformanceManagementService pmcService)
    {
        _activityRepository = activityRepository;
        _pmcService = pmcService;
    }

    public async Task<MonthlySummaryDto> Handle(GetMonthlySummaryQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var year = request.Year ?? now.Year;
        var month = request.Month ?? now.Month;

        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1).AddSeconds(-1);

        var activities = await _activityRepository.GetByUserIdAsync(request.UserId, 1, 10000, cancellationToken);
        
        var monthActivities = activities
            .Where(a => a.StartDate >= monthStart && a.StartDate <= monthEnd)
            .ToList();

        var totalDistance = monthActivities.Sum(a => a.Distance.ToKilometers());
        var totalMovingTime = TimeSpan.FromSeconds(monthActivities.Sum(a => a.MovingTime.Seconds));
        var totalElevationGain = monthActivities.Sum(a => a.TotalElevationGain);
        var totalTSS = monthActivities.Where(a => a.TrainingStressScore.HasValue).Sum(a => a.TrainingStressScore!.Value);

        // Calculate average CTL for the month
        var pmcData = await _pmcService.CalculatePmcAsync(request.UserId, monthStart, monthEnd);
        var avgCtl = pmcData.Any() ? pmcData.Average(p => p.CTL) : (float?)null;

        var rideCount = monthActivities.Count(a => a.Type.Value.Contains("Ride", StringComparison.OrdinalIgnoreCase));
        var runCount = monthActivities.Count(a => a.Type.Value.Contains("Run", StringComparison.OrdinalIgnoreCase));

        return new MonthlySummaryDto(
            year,
            month,
            monthActivities.Count,
            totalDistance,
            totalMovingTime,
            totalElevationGain,
            totalTSS > 0 ? totalTSS : null,
            avgCtl,
            rideCount,
            runCount);
    }
}
