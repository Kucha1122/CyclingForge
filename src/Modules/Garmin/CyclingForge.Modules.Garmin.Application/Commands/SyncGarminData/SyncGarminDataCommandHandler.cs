using CyclingForge.Modules.Garmin.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Exceptions;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Commands.SyncGarminData;

internal sealed class SyncGarminDataCommandHandler : IRequestHandler<SyncGarminDataCommand>
{
    private readonly IGarminApiService _garminApiService;
    private readonly IGarminTokenRepository _tokenRepository;
    private readonly IGarminSleepRepository _sleepRepository;
    private readonly IGarminWellnessRepository _wellnessRepository;
    private readonly IClock _clock;

    public SyncGarminDataCommandHandler(
        IGarminApiService garminApiService,
        IGarminTokenRepository tokenRepository,
        IGarminSleepRepository sleepRepository,
        IGarminWellnessRepository wellnessRepository,
        IClock clock)
    {
        _garminApiService = garminApiService;
        _tokenRepository = tokenRepository;
        _sleepRepository = sleepRepository;
        _wellnessRepository = wellnessRepository;
        _clock = clock;
    }

    public async Task Handle(SyncGarminDataCommand request, CancellationToken cancellationToken)
    {
        var token = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken)
            ?? throw new GarminAuthorizationException("Garmin account is not connected.");

        var now = _clock.CurrentDate();
        var startDate = DateOnly.FromDateTime(now.AddDays(-request.DaysBack));
        var endDate = DateOnly.FromDateTime(now);

        await SyncSleepDataAsync(token, request.UserId, startDate, endDate, now, cancellationToken);
        await SyncWellnessDataAsync(token, request.UserId, startDate, endDate, now, cancellationToken);
    }

    private async Task SyncSleepDataAsync(
        GarminToken token, Guid userId, DateOnly startDate, DateOnly endDate, DateTime now, CancellationToken ct)
    {
        var sleepEntries = await _garminApiService.GetSleepDataAsync(
            token.Token, token.TokenSecret, startDate, endDate, ct);

        foreach (var entry in sleepEntries)
        {
            var existing = await _sleepRepository.GetByUserIdAndDateAsync(userId, entry.Date, ct);
            if (existing is not null)
            {
                existing.Update(
                    entry.TotalSleepSeconds, entry.DeepSleepSeconds, entry.LightSleepSeconds,
                    entry.RemSleepSeconds, entry.AwakeSeconds, entry.SleepScore,
                    entry.AverageSpO2, entry.AverageRespirationRate,
                    entry.SleepStartTime, entry.SleepEndTime, now);
                await _sleepRepository.UpdateAsync(existing, ct);
            }
            else
            {
                var sleep = GarminSleepData.Create(
                    userId, entry.Date,
                    entry.TotalSleepSeconds, entry.DeepSleepSeconds, entry.LightSleepSeconds,
                    entry.RemSleepSeconds, entry.AwakeSeconds, entry.SleepScore,
                    entry.AverageSpO2, entry.AverageRespirationRate,
                    entry.SleepStartTime, entry.SleepEndTime, now);
                await _sleepRepository.AddAsync(sleep, ct);
            }
        }
    }

    private async Task SyncWellnessDataAsync(
        GarminToken token, Guid userId, DateOnly startDate, DateOnly endDate, DateTime now, CancellationToken ct)
    {
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var wellness = await _garminApiService.GetDailyWellnessAsync(
                token.Token, token.TokenSecret, date, ct);
            if (wellness is null) continue;

            var existing = await _wellnessRepository.GetByUserIdAndDateAsync(userId, date, ct);
            if (existing is not null)
            {
                existing.Update(
                    wellness.Vo2MaxMlPerMinPerKg, wellness.TrainingReadinessScore,
                    wellness.TrainingReadinessLevel, wellness.BodyBatteryMin,
                    wellness.BodyBatteryMax, wellness.AverageStressLevel,
                    wellness.StepsCount, now);
                await _wellnessRepository.UpdateAsync(existing, ct);
            }
            else
            {
                var entity = GarminDailyWellness.Create(
                    userId, date,
                    wellness.Vo2MaxMlPerMinPerKg, wellness.TrainingReadinessScore,
                    wellness.TrainingReadinessLevel, wellness.BodyBatteryMin,
                    wellness.BodyBatteryMax, wellness.AverageStressLevel,
                    wellness.StepsCount, now);
                await _wellnessRepository.AddAsync(entity, ct);
            }
        }
    }
}
