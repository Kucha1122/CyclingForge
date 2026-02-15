using CyclingForge.Modules.Activities.Application.Commands.SyncActivities;
using CyclingForge.Modules.Activities.Application.Queries.GetActivities;
using CyclingForge.Modules.Activities.Application.Queries.GetActivityDetails;
using CyclingForge.Shared.Abstractions.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CyclingForge.Modules.Activities.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
internal sealed class ActivitiesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public ActivitiesController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpPost("sync")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<int>> SyncActivities(CancellationToken cancellationToken)
    {
        var command = new SyncActivitiesCommand(_currentUser.UserId);
        var syncedCount = await _mediator.Send(command, cancellationToken);
        return Ok(new { syncedCount });
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ActivityDto>>> GetActivities(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetActivitiesQuery(_currentUser.UserId, page, pageSize);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{activityId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ActivityDetailsDto>> GetActivityDetails(
        [FromRoute] Guid activityId,
        CancellationToken cancellationToken)
    {
        var query = new GetActivityDetailsQuery(activityId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }
}
