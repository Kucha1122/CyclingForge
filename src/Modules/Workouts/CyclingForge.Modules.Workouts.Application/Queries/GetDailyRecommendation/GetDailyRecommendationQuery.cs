using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetDailyRecommendation;

public sealed record GetDailyRecommendationQuery(Guid UserId, DateOnly Date) : IQuery<DailyRecommendationDto?>;
