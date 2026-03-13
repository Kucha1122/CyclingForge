using CyclingForge.Modules.Workouts.Application.Commands.CreateWorkout;
using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.UpdateWorkout;

public sealed record UpdateWorkoutCommand(
    Guid UserId,
    Guid WorkoutId,
    string Name,
    string Description,
    string Category,
    string TargetZone,
    bool IsPublic,
    string? Tags,
    IReadOnlyList<CreateWorkoutStepDto> Steps) : ICommand;
