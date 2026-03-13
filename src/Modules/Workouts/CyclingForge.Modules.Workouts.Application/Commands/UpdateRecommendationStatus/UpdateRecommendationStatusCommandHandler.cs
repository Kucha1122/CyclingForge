using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.UpdateRecommendationStatus;

internal sealed class UpdateRecommendationStatusCommandHandler : IRequestHandler<UpdateRecommendationStatusCommand>
{
    private readonly IDailyRecommendationRepository _repository;

    public UpdateRecommendationStatusCommandHandler(IDailyRecommendationRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(UpdateRecommendationStatusCommand request, CancellationToken cancellationToken)
    {
        var recommendation = await _repository.GetByIdAsync(request.RecommendationId, cancellationToken)
            ?? throw new InvalidOperationException("Recommendation not found.");

        if (recommendation.UserId != request.UserId)
            throw new UnauthorizedAccessException("Access denied.");

        var status = Enum.Parse<RecommendationStatus>(request.Status);

        switch (status)
        {
            case RecommendationStatus.Accepted:
                recommendation.Accept();
                break;
            case RecommendationStatus.Completed:
                recommendation.Complete(request.CompletedActivityId);
                break;
            case RecommendationStatus.Skipped:
                recommendation.Skip();
                break;
        }

        await _repository.UpdateAsync(recommendation, cancellationToken);
    }
}
