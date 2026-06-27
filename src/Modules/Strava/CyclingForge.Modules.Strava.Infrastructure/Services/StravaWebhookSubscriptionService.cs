using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CyclingForge.Modules.Strava.Infrastructure.Services;

/// <summary>
/// Ensures (idempotently) that a Strava push subscription pointing at our webhook callback exists.
/// Runs once shortly after startup; failures are logged but never crash the app.
/// </summary>
internal sealed class StravaWebhookSubscriptionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly StravaOptions _options;
    private readonly ILogger<StravaWebhookSubscriptionService> _logger;

    public StravaWebhookSubscriptionService(
        IServiceScopeFactory scopeFactory,
        IOptions<StravaOptions> options,
        ILogger<StravaWebhookSubscriptionService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_options.WebhookCallbackUrl)
            || string.IsNullOrWhiteSpace(_options.WebhookVerifyToken)
            || string.IsNullOrWhiteSpace(_options.ClientId)
            || string.IsNullOrWhiteSpace(_options.ClientSecret))
        {
            _logger.LogInformation(
                "Strava webhook subscription skipped: callback URL / verify token / client credentials not configured.");
            return;
        }

        // Give the web server a moment to start listening so Strava's validation GET can reach us.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var httpClient = scope.ServiceProvider.GetRequiredService<StravaHttpClient>();

            var existing = await httpClient.GetPushSubscriptionsAsync(
                _options.ClientId, _options.ClientSecret, stoppingToken);

            if (existing is not null && existing.Any(s =>
                    string.Equals(s.CallbackUrl, _options.WebhookCallbackUrl, StringComparison.OrdinalIgnoreCase)))
            {
                _logger.LogInformation("Strava push subscription already registered for {CallbackUrl}.", _options.WebhookCallbackUrl);
                return;
            }

            var (success, body) = await httpClient.CreatePushSubscriptionAsync(
                _options.ClientId, _options.ClientSecret, _options.WebhookCallbackUrl, _options.WebhookVerifyToken, stoppingToken);

            if (success)
            {
                _logger.LogInformation("Registered Strava push subscription for {CallbackUrl}.", _options.WebhookCallbackUrl);
            }
            else
            {
                _logger.LogWarning("Failed to register Strava push subscription: {Body}", body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while ensuring Strava push subscription.");
        }
    }
}
