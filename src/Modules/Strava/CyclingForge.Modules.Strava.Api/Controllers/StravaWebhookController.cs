using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace CyclingForge.Modules.Strava.Api.Controllers;

/// <summary>
/// Public (unauthenticated) endpoint that Strava calls for webhook validation (GET) and
/// activity push events (POST). See https://developers.strava.com/docs/webhooks/
/// </summary>
[ApiController]
[Route("api/strava/webhook")]
[AllowAnonymous]
public sealed class StravaWebhookController : ControllerBase
{
    private readonly IStravaWebhookQueue _queue;
    private readonly StravaOptions _options;

    public StravaWebhookController(IStravaWebhookQueue queue, IOptions<StravaOptions> options)
    {
        _queue = queue;
        _options = options.Value;
    }

    /// <summary>Subscription validation handshake — echo hub.challenge if the verify token matches.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult Validate(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.challenge")] string? challenge,
        [FromQuery(Name = "hub.verify_token")] string? verifyToken)
    {
        if (mode != "subscribe"
            || string.IsNullOrEmpty(challenge)
            || verifyToken != _options.WebhookVerifyToken)
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        return Ok(new Dictionary<string, string> { ["hub.challenge"] = challenge });
    }

    /// <summary>Receive an event, enqueue it, and acknowledge immediately (Strava expects 200 within ~2s).</summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Receive(
        [FromBody] StravaWebhookEvent webhookEvent,
        CancellationToken cancellationToken)
    {
        await _queue.EnqueueAsync(webhookEvent, cancellationToken);
        return Ok();
    }
}
