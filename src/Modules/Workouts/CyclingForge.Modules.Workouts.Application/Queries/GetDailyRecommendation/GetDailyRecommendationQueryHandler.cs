using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetDailyRecommendation;

internal sealed class GetDailyRecommendationQueryHandler
    : IRequestHandler<GetDailyRecommendationQuery, DailyRecommendationDto?>
{
    private readonly IDailyRecommendationRepository _repository;
    private readonly ITrainingPreferenceRepository _preferenceRepository;
    private readonly IPlanPeriodizationService _periodizationService;
    private readonly IRecommendationEngine _recommendationEngine;

    public GetDailyRecommendationQueryHandler(
        IDailyRecommendationRepository repository,
        ITrainingPreferenceRepository preferenceRepository,
        IPlanPeriodizationService periodizationService,
        IRecommendationEngine recommendationEngine)
    {
        _repository = repository;
        _preferenceRepository = preferenceRepository;
        _periodizationService = periodizationService;
        _recommendationEngine = recommendationEngine;
    }

    public async Task<DailyRecommendationDto?> Handle(GetDailyRecommendationQuery request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByUserIdAndDateAsync(request.UserId, request.Date, cancellationToken);
        if (existing is not null)
            // Refresh the readiness snapshot so a recommendation generated earlier (e.g. before today's
            // Garmin sync) reflects the current readiness value instead of a stale one.
            return await _recommendationEngine.RefreshReadinessAsync(
                existing.ToDto(), request.UserId, request.Date, cancellationToken);

        var preference = await _preferenceRepository.GetActiveByUserIdAsync(request.UserId, cancellationToken);
        var intent = preference is not null
            ? _periodizationService.GetActivePlanIntent(preference, request.Date)
            : null;

        return await _recommendationEngine.GenerateRecommendationAsync(
            request.UserId, request.Date, cancellationToken, null, intent);
    }
}
