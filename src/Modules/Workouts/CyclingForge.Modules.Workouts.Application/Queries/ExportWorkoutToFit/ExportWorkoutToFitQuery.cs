using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.ExportWorkoutToFit;

public sealed record ExportWorkoutToFitQuery(Guid WorkoutId) : IQuery<byte[]?>;
