using CyclingForge.Modules.Strava.Application.Commands.SyncSingleActivity;
using CyclingForge.Modules.Strava.Application.Services;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CyclingForge.Modules.Strava.Infrastructure.Services;

/// <summary>
/// Background consumer that drains the webhook queue and turns each "activity" event into a
/// <see cref="SyncSingleActivityCommand"/>. Runs in its own DI scope per event.
/// </summary>
internal sealed class StravaWebhookProcessor : BackgroundService
{
    private readonly IStravaWebhookQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StravaWebhookProcessor> _logger;

    public StravaWebhookProcessor(
        IStravaWebhookQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<StravaWebhookProcessor> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var webhookEvent in _queue.DequeueAllAsync(stoppingToken))
        {
            // Only activity events are relevant; ignore athlete (deauth/profile) events for now.
            if (!string.Equals(webhookEvent.ObjectType, "activity", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
                await mediator.Send(
                    new SyncSingleActivityCommand(webhookEvent.OwnerId, webhookEvent.ObjectId, webhookEvent.AspectType),
                    stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to process Strava webhook event for activity {ActivityId} (owner {OwnerId}).",
                    webhookEvent.ObjectId, webhookEvent.OwnerId);
            }
        }
    }
}
