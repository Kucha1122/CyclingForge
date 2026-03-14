using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetFullPlan;

internal sealed class GetFullPlanQueryHandler : IRequestHandler<GetFullPlanQuery, FullPlanDto>
{
    private readonly IDailyRecommendationRepository _repository;
    private readonly IRecommendationEngine _recommendationEngine;
    private readonly IClock _clock;

    public GetFullPlanQueryHandler(
        IDailyRecommendationRepository repository,
        IRecommendationEngine recommendationEngine,
        IClock clock)
    {
        _repository = repository;
        _recommendationEngine = recommendationEngine;
        _clock = clock;
    }

    public async Task<FullPlanDto> Handle(GetFullPlanQuery request, CancellationToken cancellationToken)
    {
        var weeks = Math.Clamp(request.Weeks, 1, 52);
        var today = DateOnly.FromDateTime(_clock.CurrentDate());
        var planStart = GetMondayOfWeek(today);
        var planEnd = planStart.AddDays(weeks * 7 - 1);
        var weeksData = new List<WeeklyPlanDto>();
        var recentlyRecommendedWorkoutIds = new List<Guid>();

        for (var w = 0; w < weeks; w++)
        {
            var weekStart = planStart.AddDays(w * 7);
            var weekEnd = weekStart.AddDays(6);
            var existingRecs = await _repository.GetByUserIdAndDateRangeAsync(
                request.UserId, weekStart, weekEnd, cancellationToken);

            var days = new List<DailyRecommendationDto>();
            for (var i = 0; i < 7; i++)
            {
                var date = weekStart.AddDays(i);
                var existing = existingRecs.FirstOrDefault(r => r.Date == date);

                if (existing is not null)
                {
                    days.Add(existing.ToDto());
                    if (existing.RecommendedWorkoutId.HasValue)
                        recentlyRecommendedWorkoutIds.Add(existing.RecommendedWorkoutId.Value);
                }
                else
                {
                    var avoidIds = recentlyRecommendedWorkoutIds.Count > 20
                        ? recentlyRecommendedWorkoutIds.TakeLast(14).ToList()
                        : recentlyRecommendedWorkoutIds;
                    var generated = await _recommendationEngine.GenerateRecommendationAsync(
                        request.UserId, date, cancellationToken, avoidIds);
                    days.Add(generated);
                    if (generated.RecommendedWorkout is { } rec)
                        recentlyRecommendedWorkoutIds.Add(rec.Id);
                }
            }

            weeksData.Add(new WeeklyPlanDto(weekStart, weekEnd, days));
        }

        return new FullPlanDto(planStart, planEnd, weeks, weeksData);
    }

    private static DateOnly GetMondayOfWeek(DateOnly date)
    {
        var daysFromMonday = ((int)date.DayOfWeek + 6) % 7;
        return date.AddDays(-daysFromMonday);
    }
}
