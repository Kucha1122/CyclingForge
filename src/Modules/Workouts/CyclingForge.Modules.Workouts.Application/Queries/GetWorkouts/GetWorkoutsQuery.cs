using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetWorkouts;

public sealed record GetWorkoutsQuery(
    Guid UserId,
    string? Category,
    string? Zone,
    string? Source,
    int? MinDuration,
    int? MaxDuration,
    string? SearchTerm,
    string? SortBy,
    int Page = 1,
    int PageSize = 20) : IQuery<WorkoutSearchResultDto>;
