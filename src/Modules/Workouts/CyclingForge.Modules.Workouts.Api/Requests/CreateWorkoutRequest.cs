using CyclingForge.Modules.Workouts.Application.Commands.CreateWorkout;

namespace CyclingForge.Modules.Workouts.Api.Requests;

public sealed record CreateWorkoutRequest(
    string Name,
    string Description,
    string Category,
    string TargetZone,
    bool IsPublic,
    string? Tags,
    IReadOnlyList<CreateWorkoutStepDto> Steps);
