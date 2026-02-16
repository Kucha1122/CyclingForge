using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetDailyTss;

public sealed record GetDailyTssQuery(Guid UserId, int Days = 30) : IRequest<IReadOnlyList<DailyTssPointDto>>;
