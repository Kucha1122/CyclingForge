using CyclingForge.Modules.Garmin.Application.Commands.SyncGarminData;
using CyclingForge.Modules.Garmin.Application.Defaults;
using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CyclingForge.Modules.Garmin.Infrastructure.Services;

/// <summary>
/// Periodically (every minute) checks each user's configured Garmin sync schedule and triggers
/// a background <see cref="SyncGarminDataCommand"/> when a scheduled local time has elapsed since
/// the last sync. Catches up on slots missed during downtime via the most-recent-past-occurrence check.
/// </summary>
internal sealed class GarminScheduledSyncService : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GarminScheduledSyncService> _logger;

    public GarminScheduledSyncService(IServiceScopeFactory scopeFactory, ILogger<GarminScheduledSyncService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TickInterval);
        do
        {
            try
            {
                await RunTickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Garmin scheduled sync tick failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunTickAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IGarminSyncPreferenceRepository>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var preferences = await repository.GetAllEnabledAsync(cancellationToken);
        var nowUtc = DateTime.UtcNow;

        foreach (var preference in preferences)
        {
            if (!TryGetDueOccurrence(preference, nowUtc, out var occurrenceUtc))
            {
                continue;
            }

            try
            {
                await mediator.Send(new SyncGarminDataCommand(preference.UserId, GarminSyncDefaults.DaysBack), cancellationToken);
                preference.MarkSynced(nowUtc);
                await repository.UpdateAsync(preference, cancellationToken);
                _logger.LogInformation(
                    "Garmin scheduled sync completed for user {UserId} (slot {OccurrenceUtc:o}).",
                    preference.UserId, occurrenceUtc);
            }
            catch (Exception ex)
            {
                // E.g. expired garth session — log and continue with other users; retry on next due slot.
                _logger.LogWarning(ex, "Garmin scheduled sync failed for user {UserId}.", preference.UserId);
            }
        }
    }

    /// <summary>
    /// True when the most recent past scheduled occurrence (today or yesterday, in the user's time zone)
    /// is newer than the last successful sync — i.e. a slot is due.
    /// </summary>
    private bool TryGetDueOccurrence(GarminSyncPreference preference, DateTime nowUtc, out DateTime occurrenceUtc)
    {
        occurrenceUtc = default;

        var times = preference.GetSyncTimes();
        if (times.Count == 0)
        {
            return false;
        }

        TimeZoneInfo tz;
        try
        {
            tz = TimeZoneInfo.FindSystemTimeZoneById(preference.TimeZoneId);
        }
        catch (Exception)
        {
            tz = TimeZoneInfo.Utc;
        }

        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

        DateTime? mostRecentPastLocal = null;
        foreach (var time in times)
        {
            foreach (var dayOffset in new[] { 0, -1 })
            {
                var occurrence = nowLocal.Date.AddDays(dayOffset) + time.ToTimeSpan();
                if (occurrence <= nowLocal && (mostRecentPastLocal is null || occurrence > mostRecentPastLocal))
                {
                    mostRecentPastLocal = occurrence;
                }
            }
        }

        if (mostRecentPastLocal is null)
        {
            return false;
        }

        var candidateUtc = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(mostRecentPastLocal.Value, DateTimeKind.Unspecified), tz);

        if (preference.LastSyncedAtUtc is null || preference.LastSyncedAtUtc < candidateUtc)
        {
            occurrenceUtc = candidateUtc;
            return true;
        }

        return false;
    }
}
