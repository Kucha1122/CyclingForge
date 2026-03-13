using CyclingForge.Modules.Garmin.Api.Requests;
using CyclingForge.Modules.Garmin.Application.Commands.AuthorizeGarmin;
using CyclingForge.Modules.Garmin.Application.Commands.DisconnectGarmin;
using CyclingForge.Modules.Garmin.Application.Commands.SyncGarminData;
using CyclingForge.Modules.Garmin.Application.Queries.GetConnectionStatus;
using CyclingForge.Modules.Garmin.Application.Queries.GetSleepData;
using CyclingForge.Modules.Garmin.Application.Queries.GetWellnessData;
using CyclingForge.Modules.Garmin.Application.Queries.InitiateAuth;
using CyclingForge.Shared.Abstractions.Auth;
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

    public GarminController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpGet("authorize-url")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<GarminAuthUrlDto>> GetAuthorizeUrl(CancellationToken cancellationToken)
    {
        var query = new InitiateGarminAuthQuery(_currentUser.UserId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpPost("authorize")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Authorize(
        [FromBody] GarminAuthorizeRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AuthorizeGarminCommand(_currentUser.UserId, request.OAuthToken, request.OAuthVerifier);
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
}
