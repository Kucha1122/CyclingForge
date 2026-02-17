using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Strava.Application.Queries.GetAthleteZones;

public sealed record GetAthleteZonesQuery(Guid UserId) : IQuery<AthleteZonesDto?>;

public sealed record AthleteZonesDto(
    IReadOnlyList<ZoneRangeDto> HeartRateZones,
    IReadOnlyList<ZoneRangeDto> PowerZones);

public sealed record ZoneRangeDto(
    int Min,
    int Max);

