using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.DeleteAllUserWorkouts;

public sealed record DeleteAllUserWorkoutsCommand(Guid UserId) : ICommand;
