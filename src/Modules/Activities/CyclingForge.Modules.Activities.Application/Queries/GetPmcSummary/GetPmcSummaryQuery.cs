using CyclingForge.Modules.Activities.Application.Services;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetPmcSummary;

public sealed record GetPmcSummaryQuery(Guid UserId, int CtlDays = 42, int AtlDays = 7, int HistoryDays = 90) : IRequest<PmcSummary>;
