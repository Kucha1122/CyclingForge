using CyclingForge.Modules.Workouts.Api.Requests;
using CyclingForge.Modules.Workouts.Application.Commands.CopyWorkout;
using CyclingForge.Modules.Workouts.Application.Commands.CreateWorkout;
using CyclingForge.Modules.Workouts.Application.Commands.DeleteAllUserWorkouts;
using CyclingForge.Modules.Workouts.Application.Commands.DeleteWorkout;
using CyclingForge.Modules.Workouts.Application.Commands.ImportWorkout;
using CyclingForge.Modules.Workouts.Application.Commands.ImportWorkoutsFromZip;
using CyclingForge.Modules.Workouts.Application.Commands.UpdateWorkout;
using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Queries.ExportWorkoutToFit;
using CyclingForge.Modules.Workouts.Application.Queries.ExportWorkoutToZwo;
using CyclingForge.Modules.Workouts.Application.Queries.GetWorkoutDetails;
using CyclingForge.Modules.Workouts.Application.Queries.GetWorkouts;
using CyclingForge.Modules.Workouts.Application.Queries.ParseZwo;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Infrastructure.Configuration;
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
    private readonly IZwiftSeedService _zwiftSeedService;
    private readonly WorkoutSeedOptions _seedOptions;

    public WorkoutsController(
        IMediator mediator,
        ICurrentUserService currentUser,
        IZwiftSeedService zwiftSeedService,
        Microsoft.Extensions.Options.IOptions<WorkoutSeedOptions> seedOptions)
    {
        _mediator = mediator;
        _currentUser = currentUser;
        _zwiftSeedService = zwiftSeedService;
        _seedOptions = seedOptions.Value;
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

    [HttpDelete("mine")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteAllMyWorkouts(CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteAllUserWorkoutsCommand(_currentUser.UserId), cancellationToken);
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

    /// <summary>
    /// Parses ZWO XML and returns workout data without saving. Used by the designer to fill the form.
    /// </summary>
    [HttpPost("parse-zwo")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ParseZwoResultDto>> ParseZwo(
        [FromBody] ImportZwoRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var query = new ParseZwoQuery(request.ZwoXmlContent);
            var result = await _mediator.Send(query, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("import-fit")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Guid>> ImportFit(IFormFile? file, CancellationToken cancellationToken)
    {
        const long maxFitSizeBytes = 5 * 1024 * 1024; // 5 MB
        if (file == null || file.Length == 0)
            return BadRequest("No file or empty file.");
        if (!file.FileName.EndsWith(".fit", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only .fit files are allowed.");
        if (file.Length > maxFitSizeBytes)
            return BadRequest("FIT file is too large (max 5 MB).");

        await using var formStream = file.OpenReadStream();
        using var stream = new MemoryStream();
        await formStream.CopyToAsync(stream, cancellationToken);
        stream.Position = 0;

        try
        {
            var id = await _mediator.Send(new ImportWorkoutFromFitCommand(_currentUser.UserId, stream), cancellationToken);
            return CreatedAtAction(nameof(GetWorkout), new { id }, id);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("import-zip")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BulkImportZwoResult>> ImportZwoZip(IFormFile? file, CancellationToken cancellationToken)
    {
        const long maxZipSizeBytes = 50 * 1024 * 1024; // 50 MB
        if (file == null || file.Length == 0)
            return BadRequest(new BulkImportZwoResult(0, 0, [new BulkImportZwoError("", "No file or empty file.")]));
        if (!file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new BulkImportZwoResult(0, 0, [new BulkImportZwoError(file.FileName, "Only .zip files are allowed.")]));
        if (file.Length > maxZipSizeBytes)
            return BadRequest(new BulkImportZwoResult(0, 0, [new BulkImportZwoError(file.FileName, "ZIP file is too large (max 50 MB).")]));

        await using var stream = file.OpenReadStream();
        var result = await _mediator.Send(new ImportWorkoutsFromZipCommand(_currentUser.UserId, stream), cancellationToken);
        return Ok(result);
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

    [HttpGet("{id:guid}/export/fit")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExportFit(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new ExportWorkoutToFitQuery(id), cancellationToken);
        if (result is null) return NotFound();
        return File(result, "application/octet-stream", "workout.fit");
    }

    [HttpPost("seed-zwift")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SeedZwiftResponse>> SeedZwift(CancellationToken cancellationToken)
    {
        if (!_seedOptions.SeedZwiftEnabled || string.IsNullOrWhiteSpace(_seedOptions.SeedZwiftFromPath))
            return BadRequest(new SeedZwiftResponse(0, "Zwift seed is disabled or path not configured."));

        var addedCount = await _zwiftSeedService.SeedFromPathAsync(_seedOptions.SeedZwiftFromPath, cancellationToken);
        return Ok(new SeedZwiftResponse(addedCount, null));
    }
}

public sealed record SeedZwiftResponse(int AddedCount, string? ErrorMessage);
