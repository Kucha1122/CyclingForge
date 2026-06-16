using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.RegenerateTodayRecommendation;

internal sealed class RegenerateTodayRecommendationCommandHandler
    : IRequestHandler<RegenerateTodayRecommendationCommand, DailyRecommendationDto>
{
    private readonly IDailyRecommendationRepository _repository;
    private readonly ITrainingPreferenceRepository _preferenceRepository;
    private readonly IPlanPeriodizationService _periodizationService;
    private readonly IRecommendationEngine _recommendationEngine;
    private readonly IClock _clock;

    public RegenerateTodayRecommendationCommandHandler(
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

    public async Task<DailyRecommendationDto> Handle(
        RegenerateTodayRecommendationCommand request,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(_clock.CurrentDate());
        await _repository.DeleteByUserIdFromDateAsync(request.UserId, today, cancellationToken);

        var preference = await _preferenceRepository.GetActiveByUserIdAsync(request.UserId, cancellationToken);
        var intent = preference is not null
            ? _periodizationService.GetActivePlanIntent(preference, today)
            : null;

        return await _recommendationEngine.GenerateRecommendationAsync(
            request.UserId, today, cancellationToken, null, intent);
    }
}
