using CyclingForge.Modules.Activities.Application.Commands.SyncActivities;
using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Queries.GetRealizedWeek;

internal sealed class GetRealizedWeekQueryHandler : IRequestHandler<GetRealizedWeekQuery, RealizedWeekDto>
{
    private readonly IActivityRepository _activityRepository;
    private readonly IStravaActivitiesService _stravaService;

    public GetRealizedWeekQueryHandler(
        IActivityRepository activityRepository,
        IStravaActivitiesService stravaService)
    {
        _activityRepository = activityRepository;
        _stravaService = stravaService;
    }

    public async Task<RealizedWeekDto> Handle(GetRealizedWeekQuery request, CancellationToken cancellationToken)
    {
        var weekStart = request.WeekStart;
        var weekEnd = weekStart.AddDays(6);

        var rangeStart = weekStart.ToDateTime(TimeOnly.MinValue);
        var rangeEnd = weekStart.AddDays(7).ToDateTime(TimeOnly.MinValue); // exclusive upper bound

        var activities = await _activityRepository.GetByUserIdAndDateRangeAsync(
            request.UserId, rangeStart, rangeEnd, cancellationToken);

        var hrBreakdowns = await _stravaService.GetHrTimeInZonesAsync(
            request.UserId, rangeStart, rangeEnd, cancellationToken);
        var hrByStravaId = hrBreakdowns
            .GroupBy(b => b.StravaId)
            .ToDictionary(g => g.Key, g => g.First().SecondsPerZone);

        // Zone count is driven by the user's configured HR zones; fall back to 0 when unknown.
        var zoneCount = hrByStravaId.Values
            .Select(s => s.Count)
            .DefaultIfEmpty(0)
            .Max();

        var weeklyZones = new int[zoneCount];
        var days = new List<RealizedDayDto>(7);

        for (var i = 0; i < 7; i++)
        {
            var date = weekStart.AddDays(i);
            var dayActivities = activities
                .Where(a => DateOnly.FromDateTime(a.StartDate) == date)
                .OrderBy(a => a.StartDate)
                .ToList();

            var dailyZones = new int[zoneCount];
            var mapped = new List<RealizedActivityDto>(dayActivities.Count);

            foreach (var a in dayActivities)
            {
                var zoneSeconds = ResolveZoneSeconds(hrByStravaId, a.StravaActivityId, zoneCount);
                for (var z = 0; z < zoneCount; z++)
                {
                    dailyZones[z] += zoneSeconds[z];
                    weeklyZones[z] += zoneSeconds[z];
                }

                mapped.Add(new RealizedActivityDto(
                    a.Id.Value,
                    a.StravaActivityId,
                    a.Name,
                    a.Type.Value,
                    a.StartDate,
                    a.Distance.ToKilometers(),
                    a.MovingTime.Seconds,
                    a.TrainingStressScore,
                    a.AverageHeartRate,
                    zoneSeconds));
            }

            days.Add(new RealizedDayDto(date, mapped, dailyZones));
        }

        return new RealizedWeekDto(weekStart, weekEnd, days, weeklyZones);
    }

    private static IReadOnlyList<int> ResolveZoneSeconds(
        IReadOnlyDictionary<long, IReadOnlyList<int>> hrByStravaId, long stravaId, int zoneCount)
    {
        if (hrByStravaId.TryGetValue(stravaId, out var seconds) && seconds.Count == zoneCount)
            return seconds;

        return new int[zoneCount];
    }
}
