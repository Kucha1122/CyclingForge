using CyclingForge.Modules.Strava.Api.Requests;
using CyclingForge.Modules.Strava.Application.Commands.Authorize;
using CyclingForge.Modules.Strava.Application.Commands.RefreshToken;
using CyclingForge.Modules.Strava.Application.Queries.GetAthleteProfile;
using CyclingForge.Shared.Abstractions.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CyclingForge.Modules.Strava.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class StravaController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public StravaController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpPost("authorize")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Authorize(
        [FromBody] StravaCallbackRequest request,
        CancellationToken cancellationToken)
    {
        var command = new AuthorizeStravaCommand(_currentUser.UserId, request.Code);
        await _mediator.Send(command, cancellationToken);
        return Ok();
    }

    [HttpPost("refresh")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RefreshToken(CancellationToken cancellationToken)
    {
        var command = new RefreshStravaTokenCommand(_currentUser.UserId);
        await _mediator.Send(command, cancellationToken);
        return Ok();
    }

    [HttpGet("athlete")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AthleteProfileDto>> GetAthleteProfile(CancellationToken cancellationToken)
    {
        var query = new GetAthleteProfileQuery(_currentUser.UserId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }
}
