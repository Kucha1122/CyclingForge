using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetPowerCurve;

internal sealed class GetPowerCurveQueryHandler : IRequestHandler<GetPowerCurveQuery, PowerCurveDto>
{
    private readonly IActivityRepository _activityRepository;
    private readonly IUserFtpProvider _ftpProvider;

    public GetPowerCurveQueryHandler(IActivityRepository activityRepository, IUserFtpProvider ftpProvider)
    {
        _activityRepository = activityRepository;
        _ftpProvider = ftpProvider;
    }

    public async Task<PowerCurveDto> Handle(GetPowerCurveQuery request, CancellationToken cancellationToken)
    {
        var end = DateTime.UtcNow;
        var start = request.WindowDays > 0 ? end.AddDays(-request.WindowDays) : DateTime.MinValue;

        var activities = await _activityRepository.GetByUserIdAndDateRangeAsync(request.UserId, start, end, cancellationToken);

        // Only cycling activities carry meaningful power. Treat the stored best-effort fields as the
        // mean-maximal power for their bucket and keep the highest value across the window.
        var rides = activities
            .Where(a => IsCycling(a.Type.Value))
            .ToList();

        var weightKg = await _ftpProvider.GetWeightKgAsync(request.UserId, cancellationToken);

        var buckets = new (int Duration, float? Value)[]
        {
            (1, rides.Max(a => a.MaxPower)),
            (300, rides.Max(a => a.Best5MinPower)),
            (1200, rides.Max(a => a.Best20MinPower)),
            (3600, rides.Max(a => a.Best60MinPower)),
        };

        decimal? PerKg(float watts) => weightKg is > 0 ? Math.Round((decimal)(watts / weightKg.Value), 2) : null;

        var points = buckets
            .Where(b => b.Value is > 0)
            .Select(b => new PowerCurvePointDto(b.Duration, (int)Math.Round(b.Value!.Value), PerKg(b.Value!.Value)))
            .ToList();

        // Two-parameter Critical Power model P(t) = W'/t + CP, solved from the 5- and 20-minute bests.
        int? cp = null;
        int? wPrime = null;
        var p5 = rides.Max(a => a.Best5MinPower);
        var p20 = rides.Max(a => a.Best20MinPower);
        if (p5 is > 0 && p20 is > 0
            && CriticalPowerModel.Estimate(300, p5.Value, 1200, p20.Value) is { } fit)
        {
            cp = (int)Math.Round(fit.CriticalPower);
            wPrime = (int)Math.Round(fit.WPrime);
        }

        return new PowerCurveDto(
            request.WindowDays,
            rides.Count,
            points,
            cp,
            wPrime,
            cp is > 0 ? PerKg(cp.Value) : null);
    }

    private static bool IsCycling(string sport) =>
        string.Equals(sport, "Ride", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(sport, "VirtualRide", StringComparison.OrdinalIgnoreCase);
}
