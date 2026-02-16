using System.Text.Json;
using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Activities.Domain.ValueObjects;
using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Activities.Application.Commands.SyncActivities;

internal sealed class SyncActivitiesCommandHandler : IRequestHandler<SyncActivitiesCommand, int>
{
    private readonly IActivityRepository _activityRepository;
    private readonly IStravaActivitiesService _stravaService;
    private readonly IUserFtpProvider _ftpProvider;
    private readonly IUserLthrProvider _lthrProvider;
    private readonly ITrainingMetricsCalculator _metricsCalculator;
    private readonly IClock _clock;

    public SyncActivitiesCommandHandler(
        IActivityRepository activityRepository,
        IStravaActivitiesService stravaService,
        IUserFtpProvider ftpProvider,
        IUserLthrProvider lthrProvider,
        ITrainingMetricsCalculator metricsCalculator,
        IClock clock)
    {
        _activityRepository = activityRepository;
        _stravaService = stravaService;
        _ftpProvider = ftpProvider;
        _lthrProvider = lthrProvider;
        _metricsCalculator = metricsCalculator;
        _clock = clock;
    }

    public async Task<int> Handle(SyncActivitiesCommand request, CancellationToken cancellationToken)
    {
        var stravaActivities = await _stravaService.FetchActivitiesAsync(request.UserId, cancellationToken);
        var userFtp = await _ftpProvider.GetFtpAsync(request.UserId, cancellationToken);
        var userLthr = await _lthrProvider.GetLthrAsync(request.UserId, cancellationToken);
        var syncedCount = 0;
        var now = _clock.CurrentDate();

        foreach (var stravaActivity in stravaActivities)
        {
            var existingActivity = await _activityRepository
                .GetByStravaIdAsync(stravaActivity.StravaId, request.UserId, cancellationToken);

            if (existingActivity is not null)
            {
                existingActivity.Update(
                    stravaActivity.Name,
                    new Distance(stravaActivity.Distance),
                    new Duration(stravaActivity.MovingTime),
                    new Duration(stravaActivity.ElapsedTime),
                    stravaActivity.TotalElevationGain,
                    stravaActivity.AverageSpeed,
                    stravaActivity.MaxSpeed,
                    stravaActivity.AverageHeartRate,
                    stravaActivity.MaxHeartRate,
                    stravaActivity.AveragePower,
                    now);

                ApplyTssIfPossible(existingActivity, stravaActivity, userFtp, userLthr);
                await _activityRepository.UpdateAsync(existingActivity, cancellationToken);
            }
            else
            {
                var activity = Activity.Create(
                    request.UserId,
                    stravaActivity.StravaId,
                    stravaActivity.Name,
                    ActivityType.FromString(stravaActivity.Type),
                    stravaActivity.StartDate,
                    new Distance(stravaActivity.Distance),
                    new Duration(stravaActivity.MovingTime),
                    new Duration(stravaActivity.ElapsedTime),
                    stravaActivity.TotalElevationGain,
                    stravaActivity.AverageSpeed,
                    stravaActivity.MaxSpeed,
                    stravaActivity.AverageHeartRate,
                    stravaActivity.MaxHeartRate,
                    stravaActivity.AveragePower,
                    now);

                ApplyTssIfPossible(activity, stravaActivity, userFtp, userLthr);
                await _activityRepository.AddAsync(activity, cancellationToken);
                syncedCount++;
            }
        }

        return syncedCount;
    }

    private void ApplyTssIfPossible(Activity activity, StravaActivityDto dto, int? userFtp, int? userLthr)
    {
        if (userFtp.HasValue && userFtp.Value > 0)
        {
            float? np = null;
            if (!string.IsNullOrEmpty(dto.StreamsJson) && TryParseWattsFromStreams(dto.StreamsJson, out var powerData) && powerData.Count > 0)
                np = _metricsCalculator.CalculateNormalizedPower(powerData);
            if (!np.HasValue && dto.AveragePower.HasValue && dto.AveragePower.Value > 0)
                np = (float)dto.AveragePower.Value;

            if (np.HasValue)
            {
                var if_ = _metricsCalculator.CalculateIntensityFactor(np, userFtp);
                if (if_.HasValue)
                {
                    var tss = _metricsCalculator.CalculateTrainingStressScore(np, if_, dto.MovingTime, userFtp);
                    if (tss.HasValue)
                    {
                        activity.UpdateMetrics(
                            maxPower: dto.AveragePower,
                            normalizedPower: np.Value,
                            intensityFactor: if_.Value,
                            trainingStressScore: tss);
                        return;
                    }
                }
            }
        }

        if (dto.AverageHeartRate.HasValue && userLthr.HasValue && userLthr.Value > 0)
        {
            var hrTss = _metricsCalculator.CalculateHeartRateBasedTss(
                dto.AverageHeartRate, (float)userLthr.Value, dto.MovingTime);
            if (hrTss.HasValue)
                activity.UpdateMetrics(maxPower: null, normalizedPower: null, intensityFactor: null, trainingStressScore: hrTss);
        }
    }

    private static bool TryParseWattsFromStreams(string streamsJson, out List<float> powerData)
    {
        powerData = new List<float>();
        try
        {
            using var doc = JsonDocument.Parse(streamsJson);
            foreach (var element in doc.RootElement.EnumerateArray())
            {
                if (element.TryGetProperty("type", out var typeEl) && typeEl.GetString() == "watts"
                    && element.TryGetProperty("data", out var dataEl))
                {
                    foreach (var item in dataEl.EnumerateArray())
                    {
                        if (item.ValueKind == JsonValueKind.Number && item.TryGetSingle(out var value))
                            powerData.Add(value);
                    }
                    return powerData.Count > 0;
                }
            }
        }
        catch
        {
            // ignore
        }
        return false;
    }
}

public interface IStravaActivitiesService
{
    Task<IReadOnlyList<StravaActivityDto>> FetchActivitiesAsync(Guid userId, CancellationToken cancellationToken = default);
}

public sealed record StravaActivityDto(
    long StravaId,
    string Name,
    string Type,
    DateTime StartDate,
    float Distance,
    int MovingTime,
    int ElapsedTime,
    float TotalElevationGain,
    float? AverageSpeed,
    float? MaxSpeed,
    float? AverageHeartRate,
    float? MaxHeartRate,
    float? AveragePower,
    string? StreamsJson = null);
