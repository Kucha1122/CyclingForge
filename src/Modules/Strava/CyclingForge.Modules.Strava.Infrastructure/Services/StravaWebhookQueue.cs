using System.Threading.Channels;
using CyclingForge.Modules.Strava.Application.Services;

namespace CyclingForge.Modules.Strava.Infrastructure.Services;

internal sealed class StravaWebhookQueue : IStravaWebhookQueue
{
    private readonly Channel<StravaWebhookEvent> _channel =
        Channel.CreateBounded<StravaWebhookEvent>(new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        });

    public ValueTask EnqueueAsync(StravaWebhookEvent webhookEvent, CancellationToken cancellationToken = default)
        => _channel.Writer.WriteAsync(webhookEvent, cancellationToken);

    public IAsyncEnumerable<StravaWebhookEvent> DequeueAllAsync(CancellationToken cancellationToken = default)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}
