using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Strava.Application.Queries.GetActivityCounts;

public sealed record GetActivityCountsQuery(Guid UserId) : IQuery<ActivityCountsDto?>;

public sealed record ActivityCountsDto(int Total, int Ride, int Run, int Walk);
