using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetWeeklyPlan;

internal sealed class GetWeeklyPlanQueryHandler : IRequestHandler<GetWeeklyPlanQuery, WeeklyPlanDto>
{
    private readonly IDailyRecommendationRepository _repository;
    private readonly IRecommendationEngine _recommendationEngine;

    public GetWeeklyPlanQueryHandler(
        IDailyRecommendationRepository repository,
        IRecommendationEngine recommendationEngine)
    {
        _repository = repository;
        _recommendationEngine = recommendationEngine;
    }

    public async Task<WeeklyPlanDto> Handle(GetWeeklyPlanQuery request, CancellationToken cancellationToken)
    {
        var weekEnd = request.WeekStart.AddDays(6);

        var existingRecs = await _repository.GetByUserIdAndDateRangeAsync(
            request.UserId, request.WeekStart, weekEnd, cancellationToken);

        var days = new List<DailyRecommendationDto>();
        for (var i = 0; i < 7; i++)
        {
            var date = request.WeekStart.AddDays(i);
            var existing = existingRecs.FirstOrDefault(r => r.Date == date);

            if (existing is not null)
            {
                days.Add(existing.ToDto());
            }
            else
            {
                var generated = await _recommendationEngine.GenerateRecommendationAsync(
                    request.UserId, date, cancellationToken);
                days.Add(generated);
            }
        }

        return new WeeklyPlanDto(request.WeekStart, weekEnd, days);
    }
}
