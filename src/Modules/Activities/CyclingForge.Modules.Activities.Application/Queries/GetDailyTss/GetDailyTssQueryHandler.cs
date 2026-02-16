using CyclingForge.Modules.Activities.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetDailyTss;

internal sealed class GetDailyTssQueryHandler : IRequestHandler<GetDailyTssQuery, IReadOnlyList<DailyTssPointDto>>
{
    private readonly IActivityRepository _activityRepository;

    public GetDailyTssQueryHandler(IActivityRepository activityRepository)
    {
        _activityRepository = activityRepository;
    }

    public async Task<IReadOnlyList<DailyTssPointDto>> Handle(GetDailyTssQuery request, CancellationToken cancellationToken)
    {
        var endDate = DateTime.UtcNow.Date;
        var startDate = endDate.AddDays(-request.Days);

        var activities = await _activityRepository.GetByUserIdAsync(request.UserId, 1, 10000, cancellationToken);

        var tssByDate = activities
            .Where(a => a.TrainingStressScore.HasValue && a.StartDate >= startDate && a.StartDate <= endDate)
            .GroupBy(a => a.StartDate.Date)
            .ToDictionary(g => g.Key, g => g.Sum(a => a.TrainingStressScore!.Value));

        var dailyTss = new List<DailyTssPointDto>();
        for (var d = startDate; d <= endDate; d = d.AddDays(1))
        {
            var tss = tssByDate.TryGetValue(d, out var sum) ? sum : 0f;
            dailyTss.Add(new DailyTssPointDto(d.ToString("yyyy-MM-dd"), tss));
        }

        return dailyTss;
    }
}
