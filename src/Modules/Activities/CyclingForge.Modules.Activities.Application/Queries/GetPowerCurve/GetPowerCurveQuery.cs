using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Activities.Application.Queries.GetPowerCurve;

/// <summary>Mean-maximal power curve and Critical Power model over a rolling window. WindowDays = 0 means all-time.</summary>
public sealed record GetPowerCurveQuery(Guid UserId, int WindowDays = 42) : IQuery<PowerCurveDto>;
