using CyclingForge.Modules.Strava.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Queries.GetActivities;

internal sealed class GetActivitiesQueryHandler : IRequestHandler<GetActivitiesQuery, IEnumerable<ActivityDto>>
{
    private readonly IStravaActivityRepository _activityRepository;
    private readonly IStravaAthleteRepository _athleteRepository;

    public GetActivitiesQueryHandler(
        IStravaActivityRepository activityRepository,
        IStravaAthleteRepository athleteRepository)
    {
        _activityRepository = activityRepository;
        _athleteRepository = athleteRepository;
    }

    public async Task<IEnumerable<ActivityDto>> Handle(GetActivitiesQuery query, CancellationToken cancellationToken)
    {
        // #region agent log
        var logPath = @"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log";
        try
        {
            await System.IO.File.AppendAllTextAsync(logPath, System.Text.Json.JsonSerializer.Serialize(new { location = "GetActivitiesQueryHandler.cs", message = "handler entered", data = new { userId = query.UserId }, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), hypothesisId = "C" }) + "\n", cancellationToken);
        }
        catch { /* ignore */ }
        // #endregion
        var athlete = await _athleteRepository.GetByUserIdAsync(query.UserId, cancellationToken);
        // #region agent log
        if (athlete is null)
        {
            await System.IO.File.AppendAllTextAsync(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", System.Text.Json.JsonSerializer.Serialize(new { location = "GetActivitiesQueryHandler.cs", message = "athlete is null", data = new { userId = query.UserId }, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), hypothesisId = "C" }) + "\n", cancellationToken);
            return Enumerable.Empty<ActivityDto>();
        }
        var activities = await _activityRepository.GetByAthleteIdAsync(athlete.Id, query.Page, query.PerPage, cancellationToken);
        await System.IO.File.AppendAllTextAsync(@"c:\Users\Kucha\source\repos\CyclingForge\.cursor\debug.log", System.Text.Json.JsonSerializer.Serialize(new { location = "GetActivitiesQueryHandler.cs", message = "activities loaded", data = new { athleteId = athlete.Id, count = activities.Count }, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), hypothesisId = "C" }) + "\n", cancellationToken);
        // #endregion

        return activities.Select(a => new ActivityDto(
            a.ExternalId,
            a.Name,
            a.Type,
            a.StartDate,
            a.Distance,
            a.MovingTime,
            a.TotalElevationGain,
            a.AveragePower,
            a.AverageHeartRate));
    }
}
