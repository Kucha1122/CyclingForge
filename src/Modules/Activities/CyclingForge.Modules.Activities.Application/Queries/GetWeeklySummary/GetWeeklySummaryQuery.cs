using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetWeeklySummary;

public sealed record GetWeeklySummaryQuery(Guid UserId, DateTime? WeekStart = null) : IRequest<WeeklySummaryDto>;
