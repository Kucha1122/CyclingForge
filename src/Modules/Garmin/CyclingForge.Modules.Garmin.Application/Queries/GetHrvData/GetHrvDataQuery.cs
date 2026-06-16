using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetHrvData;

public sealed record GetHrvDataQuery(Guid UserId, DateOnly StartDate, DateOnly EndDate) : IQuery<IEnumerable<HrvDataDto>>;

public sealed record HrvDataDto(
    DateOnly Date,
    int? LastNightAvgMs,
    int? LastNight5MinHighMs,
    string? Status);
