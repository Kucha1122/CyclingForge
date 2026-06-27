using CyclingForge.Modules.Strava.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Queries.GetSyncFilters;

internal sealed class GetSyncFiltersQueryHandler : IRequestHandler<GetSyncFiltersQuery, IReadOnlyList<SyncFilterDto>>
{
    private readonly IActivitySyncFilterRepository _repository;

    public GetSyncFiltersQueryHandler(IActivitySyncFilterRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<SyncFilterDto>> Handle(GetSyncFiltersQuery request, CancellationToken cancellationToken)
    {
        var filters = await _repository.GetByUserIdAsync(request.UserId, cancellationToken);
        return filters.Select(f => new SyncFilterDto(f.Id, f.ActivityType, f.ExcludedDevicePattern)).ToList();
    }
}
