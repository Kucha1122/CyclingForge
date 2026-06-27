using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Strava.Application.Queries.GetSyncFilters;

public sealed record GetSyncFiltersQuery(Guid UserId) : IQuery<IReadOnlyList<SyncFilterDto>>;

public sealed record SyncFilterDto(Guid Id, string ActivityType, string ExcludedDevicePattern);
