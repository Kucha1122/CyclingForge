using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetFullPlan;

public sealed record GetFullPlanQuery(Guid UserId, int Weeks) : IQuery<FullPlanDto>;
