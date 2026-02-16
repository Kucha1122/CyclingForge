using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetMonthlySummary;

public sealed record GetMonthlySummaryQuery(Guid UserId, int? Year = null, int? Month = null) : IRequest<MonthlySummaryDto>;
