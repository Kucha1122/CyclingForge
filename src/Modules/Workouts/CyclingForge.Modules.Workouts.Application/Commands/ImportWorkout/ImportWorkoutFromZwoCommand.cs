using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.ImportWorkout;

public sealed record ImportWorkoutFromZwoCommand(Guid UserId, string ZwoXmlContent) : ICommand<Guid>;
