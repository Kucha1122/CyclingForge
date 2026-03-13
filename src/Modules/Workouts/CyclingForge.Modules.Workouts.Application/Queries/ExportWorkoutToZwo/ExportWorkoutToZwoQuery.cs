using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.ExportWorkoutToZwo;

public sealed record ExportWorkoutToZwoQuery(Guid WorkoutId) : IQuery<string?>;
