using CyclingForge.Modules.Activities.Application.Services;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetDailyTss;

internal sealed class GetDailyTssQueryHandler : IRequestHandler<GetDailyTssQuery, IReadOnlyList<DailyTssPointDto>>
{
    private readonly IPerformanceManagementService _performanceManagementService;

    public GetDailyTssQueryHandler(IPerformanceManagementService performanceManagementService)
    {
        _performanceManagementService = performanceManagementService;
    }

    public async Task<IReadOnlyList<DailyTssPointDto>> Handle(GetDailyTssQuery request, CancellationToken cancellationToken)
    {
        var endDate = DateTime.UtcNow.Date;
        var startDate = endDate.AddDays(-request.Days);

        var loads = await _performanceManagementService.GetDailyLoadAsync(request.UserId, startDate, endDate);
        var tssByDate = loads
            .GroupBy(x => x.date)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.tss));

        var dailyTss = new List<DailyTssPointDto>();
        for (var d = startDate; d <= endDate; d = d.AddDays(1))
        {
            var tss = tssByDate.TryGetValue(d, out var sum) ? sum : 0f;
            dailyTss.Add(new DailyTssPointDto(d.ToString("yyyy-MM-dd"), tss));
        }

        return dailyTss;
    }
}
