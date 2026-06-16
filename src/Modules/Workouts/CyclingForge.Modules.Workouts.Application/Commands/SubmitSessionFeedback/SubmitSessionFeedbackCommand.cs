using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.SubmitSessionFeedback;

public sealed record SubmitSessionFeedbackCommand(
    Guid UserId,
    Guid RecommendationId,
    int Rpe,
    string? LegsFeel,
    string? SessionQuality,
    string? Note) : ICommand;
