using CyclingForge.Modules.Garmin.Api.Requests;
using CyclingForge.Modules.Garmin.Application.Commands.ConnectGarmin;
using CyclingForge.Modules.Garmin.Application.Commands.DisconnectGarmin;
using CyclingForge.Modules.Garmin.Domain.Exceptions;
using CyclingForge.Modules.Garmin.Application.Commands.SyncGarminData;
using CyclingForge.Modules.Garmin.Application.Commands.SaveSyncPreference;
using CyclingForge.Modules.Garmin.Application.Queries.GetConnectionStatus;
using CyclingForge.Modules.Garmin.Application.Queries.GetSyncPreference;
using CyclingForge.Modules.Garmin.Application.Queries.GetHrvData;
using CyclingForge.Modules.Garmin.Application.Queries.GetSleepData;
using CyclingForge.Modules.Garmin.Application.Queries.GetWellnessData;
using CyclingForge.Shared.Abstractions.Auth;
using CyclingForge.Shared.Abstractions.RealTime;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CyclingForge.Modules.Garmin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class GarminController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;
    private readonly ISyncNotifier _syncNotifier;

    public GarminController(IMediator mediator, ICurrentUserService currentUser, ISyncNotifier syncNotifier)
    {
        _mediator = mediator;
        _currentUser = currentUser;
        _syncNotifier = syncNotifier;
    }

    [HttpPost("connect")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(GarminMfaRequiredDto), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Connect(
        [FromBody] GarminConnectRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var command = new ConnectGarminCommand(_currentUser.UserId, request.Email, request.Password);
            await _mediator.Send(command, cancellationToken);
            return Ok();
        }
        catch (GarminMfaRequiredException ex)
        {
            return Accepted(new GarminMfaRequiredDto(ex.SessionId));
        }
    }

    [HttpPost("connect/mfa")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConnectMfa(
        [FromBody] GarminConnectMfaRequest request,
        CancellationToken cancellationToken)
    {
        var command = new ConnectGarminMfaCommand(_currentUser.UserId, request.SessionId, request.MfaCode);
        await _mediator.Send(command, cancellationToken);
        return Ok();
    }

    [HttpGet("status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ConnectionStatusDto>> GetStatus(CancellationToken cancellationToken)
    {
        var query = new GetConnectionStatusQuery(_currentUser.UserId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("disconnect")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Disconnect(CancellationToken cancellationToken)
    {
        var command = new DisconnectGarminCommand(_currentUser.UserId);
        await _mediator.Send(command, cancellationToken);
        return Ok();
    }

    [HttpPost("sync")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Sync(
        [FromQuery] int daysBack = 7,
        CancellationToken cancellationToken = default)
    {
        var command = new SyncGarminDataCommand(_currentUser.UserId, daysBack);
        await _mediator.Send(command, cancellationToken);

        // Refresh this user's other open clients (web + mobile). Best-effort.
        await _syncNotifier.NotifyAsync(_currentUser.UserId, SyncKind.Garmin, cancellationToken: cancellationToken);
        return Ok();
    }

    [HttpGet("sync-preferences")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<GarminSyncPreferenceDto>> GetSyncPreferences(CancellationToken cancellationToken)
    {
        var query = new GetSyncPreferenceQuery(_currentUser.UserId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpPut("sync-preferences")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveSyncPreferences(
        [FromBody] SaveSyncPreferenceRequest request,
        CancellationToken cancellationToken)
    {
        var command = new SaveSyncPreferenceCommand(
            _currentUser.UserId, request.SyncTimes, request.Enabled, request.TimeZoneId);
        await _mediator.Send(command, cancellationToken);
        return Ok();
    }

    [HttpGet("sleep")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SleepDataDto>>> GetSleepData(
        [FromQuery] string startDate,
        [FromQuery] string endDate,
        CancellationToken cancellationToken)
    {
        var start = DateOnly.Parse(startDate);
        var end = DateOnly.Parse(endDate);
        var query = new GetSleepDataQuery(_currentUser.UserId, start, end);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("wellness")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WellnessDataDto>> GetWellness(
        [FromQuery] string date,
        CancellationToken cancellationToken)
    {
        var d = DateOnly.Parse(date);
        var query = new GetWellnessDataQuery(_currentUser.UserId, d);
        var result = await _mediator.Send(query, cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpGet("wellness/latest")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WellnessDataDto>> GetLatestWellness(
        [FromQuery] string? onOrBefore,
        CancellationToken cancellationToken)
    {
        var d = onOrBefore is not null ? DateOnly.Parse(onOrBefore) : DateOnly.FromDateTime(DateTime.UtcNow);
        var query = new GetLatestWellnessDataQuery(_currentUser.UserId, d);
        var result = await _mediator.Send(query, cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpGet("hrv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<HrvDataDto>>> GetHrv(
        [FromQuery] string startDate,
        [FromQuery] string endDate,
        CancellationToken cancellationToken)
    {
        var start = DateOnly.Parse(startDate);
        var end = DateOnly.Parse(endDate);
        var query = new GetHrvDataQuery(_currentUser.UserId, start, end);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }
}
