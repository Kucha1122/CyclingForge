using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Activities.Application.Queries.GetActivities;

public sealed record GetActivitiesQuery(Guid UserId, int Page = 1, int PageSize = 20) : IQuery<IReadOnlyList<ActivityDto>>;
