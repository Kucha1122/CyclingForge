using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetReadinessScore;

public sealed record GetReadinessScoreQuery(Guid UserId, DateOnly Date) : IQuery<ReadinessBreakdownDto>;
