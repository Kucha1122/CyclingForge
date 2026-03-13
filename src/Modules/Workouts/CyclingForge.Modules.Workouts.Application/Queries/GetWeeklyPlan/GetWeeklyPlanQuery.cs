using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetWeeklyPlan;

public sealed record GetWeeklyPlanQuery(Guid UserId, DateOnly WeekStart) : IQuery<WeeklyPlanDto>;
