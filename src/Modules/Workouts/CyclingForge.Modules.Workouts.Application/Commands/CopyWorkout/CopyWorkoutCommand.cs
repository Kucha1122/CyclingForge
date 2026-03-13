using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.CopyWorkout;

public sealed record CopyWorkoutCommand(Guid WorkoutId, Guid UserId) : ICommand<Guid>;
