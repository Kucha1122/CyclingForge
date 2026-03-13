using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.UpdateRecommendationStatus;

public sealed record UpdateRecommendationStatusCommand(
    Guid UserId,
    Guid RecommendationId,
    string Status,
    Guid? CompletedActivityId) : ICommand;
