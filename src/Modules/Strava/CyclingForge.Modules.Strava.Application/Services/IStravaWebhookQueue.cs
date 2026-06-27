using System.Text.Json.Serialization;

namespace CyclingForge.Modules.Strava.Application.Services;

/// <summary>
/// In-process queue decoupling fast webhook acknowledgement (Strava requires a 200 within ~2s)
/// from the slower work of fetching and persisting the activity.
/// </summary>
public interface IStravaWebhookQueue
{
    ValueTask EnqueueAsync(StravaWebhookEvent webhookEvent, CancellationToken cancellationToken = default);
    IAsyncEnumerable<StravaWebhookEvent> DequeueAllAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Payload of a Strava webhook push event.
/// See https://developers.strava.com/docs/webhooks/
/// </summary>
public sealed class StravaWebhookEvent
{
    [JsonPropertyName("object_type")]
    public string ObjectType { get; set; } = string.Empty;

    [JsonPropertyName("object_id")]
    public long ObjectId { get; set; }

    [JsonPropertyName("aspect_type")]
    public string AspectType { get; set; } = string.Empty;

    [JsonPropertyName("owner_id")]
    public long OwnerId { get; set; }

    [JsonPropertyName("subscription_id")]
    public long SubscriptionId { get; set; }

    [JsonPropertyName("event_time")]
    public long EventTime { get; set; }
}
