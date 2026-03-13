using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Services;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetReadinessScore;

internal sealed class GetReadinessScoreQueryHandler : IRequestHandler<GetReadinessScoreQuery, ReadinessBreakdownDto>
{
    private readonly IRecommendationEngine _recommendationEngine;

    public GetReadinessScoreQueryHandler(IRecommendationEngine recommendationEngine)
    {
        _recommendationEngine = recommendationEngine;
    }

    public async Task<ReadinessBreakdownDto> Handle(GetReadinessScoreQuery request, CancellationToken cancellationToken)
    {
        return await _recommendationEngine.GetReadinessBreakdownAsync(request.UserId, request.Date, cancellationToken);
    }
}
