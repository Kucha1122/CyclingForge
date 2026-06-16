using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetWellnessData;

/// <summary>Returns the most recent available wellness on or before <paramref name="OnOrBefore"/>.</summary>
public sealed record GetLatestWellnessDataQuery(Guid UserId, DateOnly OnOrBefore) : IQuery<WellnessDataDto?>;
