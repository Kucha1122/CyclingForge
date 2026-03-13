using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.DeleteWorkout;

public sealed record DeleteWorkoutCommand(Guid UserId, Guid WorkoutId) : ICommand;
