using CyclingForge.Modules.Activities.Application.Services;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetPmcSummary;

internal sealed class GetPmcSummaryQueryHandler : IRequestHandler<GetPmcSummaryQuery, PmcSummary>
{
    private readonly IPerformanceManagementService _performanceManagementService;

    public GetPmcSummaryQueryHandler(IPerformanceManagementService performanceManagementService)
    {
        _performanceManagementService = performanceManagementService;
    }

    public async Task<PmcSummary> Handle(GetPmcSummaryQuery request, CancellationToken cancellationToken)
    {
        return await _performanceManagementService.GetPmcSummaryAsync(request.UserId, request.CtlDays, request.AtlDays, request.HistoryDays);
    }
}
