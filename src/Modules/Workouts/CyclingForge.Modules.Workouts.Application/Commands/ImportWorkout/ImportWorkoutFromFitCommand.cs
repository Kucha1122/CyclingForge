using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.ImportWorkout;

public sealed record ImportWorkoutFromFitCommand(Guid UserId, Stream FitStream) : ICommand<Guid>;
