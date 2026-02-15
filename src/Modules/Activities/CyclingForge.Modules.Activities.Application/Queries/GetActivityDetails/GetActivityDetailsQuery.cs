using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Activities.Application.Queries.GetActivityDetails;

public sealed record GetActivityDetailsQuery(Guid ActivityId) : IQuery<ActivityDetailsDto>;
