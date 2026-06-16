using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetWeeklyPlan;

internal sealed class GetWeeklyPlanQueryHandler : IRequestHandler<GetWeeklyPlanQuery, WeeklyPlanDto>
{
    private readonly IDailyRecommendationRepository _repository;
    private readonly ITrainingPreferenceRepository _preferenceRepository;
    private readonly IPlanPeriodizationService _periodizationService;
    private readonly IRecommendationEngine _recommendationEngine;
    private readonly IClock _clock;

    public GetWeeklyPlanQueryHandler(
        IDailyRecommendationRepository repository,
        ITrainingPreferenceRepository preferenceRepository,
        IPlanPeriodizationService periodizationService,
        IRecommendationEngine recommendationEngine,
        IClock clock)
    {
        _repository = repository;
        _preferenceRepository = preferenceRepository;
        _periodizationService = periodizationService;
        _recommendationEngine = recommendationEngine;
        _clock = clock;
    }

    public async Task<WeeklyPlanDto> Handle(GetWeeklyPlanQuery request, CancellationToken cancellationToken)
    {
        var preference = await _preferenceRepository.GetActiveByUserIdAsync(request.UserId, cancellationToken);
        var weekStartDay = preference?.WeekStartDay ?? 0;

        var weekStart = request.WeekStart
            ?? WeekDates.GetWeekStart(DateOnly.FromDateTime(_clock.CurrentDate()), weekStartDay);
        var weekEnd = weekStart.AddDays(6);

        var existingRecs = await _repository.GetByUserIdAndDateRangeAsync(
            request.UserId, weekStart, weekEnd, cancellationToken);

        var macroAnchor = preference is not null
            ? WeekDates.GetWeekStart(DateOnly.FromDateTime(preference.UpdatedAt ?? preference.CreatedAt), weekStartDay)
            : weekStart;

        var days = new List<DailyRecommendationDto>();
        for (var i = 0; i < 7; i++)
        {
            var date = weekStart.AddDays(i);
            var existing = existingRecs.FirstOrDefault(r => r.Date == date);

            if (existing is not null)
            {
                days.Add(existing.ToDto());
            }
            else
            {
                var intent = preference is not null
                    ? _periodizationService.GetDayIntent(preference, macroAnchor, date)
                    : null;
                var generated = await _recommendationEngine.GenerateRecommendationAsync(
                    request.UserId, date, cancellationToken, null, intent);
                days.Add(generated);
            }
        }

        return new WeeklyPlanDto(weekStart, weekEnd, days);
    }
}
