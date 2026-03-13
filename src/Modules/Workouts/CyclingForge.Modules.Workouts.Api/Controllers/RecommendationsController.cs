using CyclingForge.Modules.Workouts.Api.Requests;
using CyclingForge.Modules.Workouts.Application.Commands.UpdateRecommendationStatus;
using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Queries.GetDailyRecommendation;
using CyclingForge.Modules.Workouts.Application.Queries.GetReadinessScore;
using CyclingForge.Modules.Workouts.Application.Queries.GetWeeklyPlan;
using CyclingForge.Shared.Abstractions.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CyclingForge.Modules.Workouts.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class RecommendationsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public RecommendationsController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpGet("today")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<DailyRecommendationDto>> GetTodayRecommendation(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await _mediator.Send(
            new GetDailyRecommendationQuery(_currentUser.UserId, today), cancellationToken);

        if (result is null)
            return Ok(new { message = "Set up your training preferences first." });

        return Ok(result);
    }

    [HttpGet("week")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<WeeklyPlanDto>> GetWeeklyPlan(
        [FromQuery] string? weekStart,
        CancellationToken cancellationToken)
    {
        var start = weekStart is not null
            ? DateOnly.Parse(weekStart)
            : GetMondayOfCurrentWeek();

        var result = await _mediator.Send(
            new GetWeeklyPlanQuery(_currentUser.UserId, start), cancellationToken);

        return Ok(result);
    }

    [HttpGet("readiness")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ReadinessBreakdownDto>> GetReadiness(
        [FromQuery] string? date,
        CancellationToken cancellationToken)
    {
        var d = date is not null
            ? DateOnly.Parse(date)
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var result = await _mediator.Send(
            new GetReadinessScoreQuery(_currentUser.UserId, d), cancellationToken);

        return Ok(result);
    }

    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateRecommendationStatusRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateRecommendationStatusCommand(
            _currentUser.UserId, id, request.Status, request.CompletedActivityId);

        await _mediator.Send(command, cancellationToken);
        return Ok();
    }

    private static DateOnly GetMondayOfCurrentWeek()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysFromMonday = ((int)today.DayOfWeek + 6) % 7;
        return today.AddDays(-daysFromMonday);
    }
}
