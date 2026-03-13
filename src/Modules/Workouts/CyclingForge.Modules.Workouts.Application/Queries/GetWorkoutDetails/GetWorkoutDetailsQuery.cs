using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetWorkoutDetails;

public sealed record GetWorkoutDetailsQuery(Guid WorkoutId) : IQuery<WorkoutDto?>;
