using CyclingForge.Modules.Workouts.Api.Requests;
using CyclingForge.Modules.Workouts.Application.Commands.CopyWorkout;
using CyclingForge.Modules.Workouts.Application.Commands.CreateWorkout;
using CyclingForge.Modules.Workouts.Application.Commands.DeleteWorkout;
using CyclingForge.Modules.Workouts.Application.Commands.ImportWorkout;
using CyclingForge.Modules.Workouts.Application.Commands.UpdateWorkout;
using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Queries.ExportWorkoutToZwo;
using CyclingForge.Modules.Workouts.Application.Queries.GetWorkoutDetails;
using CyclingForge.Modules.Workouts.Application.Queries.GetWorkouts;
using CyclingForge.Shared.Abstractions.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CyclingForge.Modules.Workouts.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class WorkoutsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public WorkoutsController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkoutSearchResultDto>> GetWorkouts(
        [FromQuery] string? category,
        [FromQuery] string? zone,
        [FromQuery] string? source,
        [FromQuery] int? minDuration,
        [FromQuery] int? maxDuration,
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetWorkoutsQuery(
            _currentUser.UserId, category, zone, source,
            minDuration, maxDuration, search, sortBy, page, pageSize);

        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkoutDto>> GetWorkout(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetWorkoutDetailsQuery(id), cancellationToken);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<Guid>> CreateWorkout(
        [FromBody] CreateWorkoutRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateWorkoutCommand(
            _currentUser.UserId,
            request.Name, request.Description, request.Category,
            request.TargetZone, request.IsPublic, request.Tags, request.Steps);

        var id = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetWorkout), new { id }, id);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateWorkout(
        Guid id,
        [FromBody] UpdateWorkoutRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateWorkoutCommand(
            _currentUser.UserId, id,
            request.Name, request.Description, request.Category,
            request.TargetZone, request.IsPublic, request.Tags, request.Steps);

        await _mediator.Send(command, cancellationToken);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteWorkout(Guid id, CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteWorkoutCommand(_currentUser.UserId, id), cancellationToken);
        return Ok();
    }

    [HttpPost("{id:guid}/copy")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Guid>> CopyWorkout(Guid id, CancellationToken cancellationToken)
    {
        var command = new CopyWorkoutCommand(id, _currentUser.UserId);
        var newId = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetWorkout), new { id = newId }, newId);
    }

    [HttpPost("import")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<Guid>> ImportZwo(
        [FromBody] ImportZwoRequest request,
        CancellationToken cancellationToken)
    {
        var command = new ImportWorkoutFromZwoCommand(_currentUser.UserId, request.ZwoXmlContent);
        var id = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetWorkout), new { id }, id);
    }

    [HttpGet("{id:guid}/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExportZwo(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ExportWorkoutToZwoQuery(id), cancellationToken);
        if (result is null) return NotFound();
        return Content(result, "application/xml");
    }
}
