using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.SubmitSessionFeedback;

internal sealed class SubmitSessionFeedbackCommandHandler : IRequestHandler<SubmitSessionFeedbackCommand>
{
    private readonly IDailyRecommendationRepository _repository;

    public SubmitSessionFeedbackCommandHandler(IDailyRecommendationRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(SubmitSessionFeedbackCommand request, CancellationToken cancellationToken)
    {
        var recommendation = await _repository.GetByIdAsync(request.RecommendationId, cancellationToken)
            ?? throw new InvalidOperationException("Recommendation not found.");

        if (recommendation.UserId != request.UserId)
            throw new UnauthorizedAccessException("Access denied.");

        LegsFeel? legs = Enum.TryParse<LegsFeel>(request.LegsFeel, out var l) ? l : null;
        SessionQuality? quality = Enum.TryParse<SessionQuality>(request.SessionQuality, out var q) ? q : null;

        recommendation.SubmitFeedback(request.Rpe, legs, quality, request.Note, DateTime.UtcNow);

        await _repository.UpdateAsync(recommendation, cancellationToken);
    }
}
