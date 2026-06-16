namespace CyclingForge.Modules.Activities.Application.Queries.GetPowerCurve;

public sealed record PowerCurvePointDto(
    int DurationSeconds,
    int Watts,
    decimal? WattsPerKg);

public sealed record PowerCurveDto(
    int WindowDays,
    int ActivityCount,
    IReadOnlyList<PowerCurvePointDto> Points,
    int? CriticalPower,
    int? WPrimeJoules,
    decimal? CriticalPowerPerKg);
