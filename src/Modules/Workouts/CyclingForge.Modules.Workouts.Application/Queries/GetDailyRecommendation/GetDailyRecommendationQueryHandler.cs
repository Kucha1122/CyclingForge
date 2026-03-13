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
    private readonly IRecommendationEngine _recommendationEngine;

    public GetDailyRecommendationQueryHandler(
        IDailyRecommendationRepository repository,
        IRecommendationEngine recommendationEngine)
    {
        _repository = repository;
        _recommendationEngine = recommendationEngine;
    }

    public async Task<DailyRecommendationDto?> Handle(GetDailyRecommendationQuery request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByUserIdAndDateAsync(request.UserId, request.Date, cancellationToken);
        if (existing is not null)
            return existing.ToDto();

        return await _recommendationEngine.GenerateRecommendationAsync(request.UserId, request.Date, cancellationToken);
    }
}
