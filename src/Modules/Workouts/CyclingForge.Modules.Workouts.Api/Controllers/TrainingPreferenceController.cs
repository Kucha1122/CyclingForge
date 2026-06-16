using CyclingForge.Modules.Workouts.Api.Requests;
using CyclingForge.Modules.Workouts.Application.Commands.SaveTrainingPreference;
using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Queries.GetTrainingPreference;
using CyclingForge.Shared.Abstractions.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CyclingForge.Modules.Workouts.Api.Controllers;

[ApiController]
[Route("api/training-preference")]
[Authorize]
public sealed class TrainingPreferenceController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUser;

    public TrainingPreferenceController(IMediator mediator, ICurrentUserService currentUser)
    {
        _mediator = mediator;
        _currentUser = currentUser;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TrainingPreferenceDto>> GetPreference(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetTrainingPreferenceQuery(_currentUser.UserId), cancellationToken);

        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<TrainingPreferenceDto>> SavePreference(
        [FromBody] SaveTrainingPreferenceRequest request,
        CancellationToken cancellationToken)
    {
        var command = new SaveTrainingPreferenceCommand(
            _currentUser.UserId,
            request.Goal,
            request.DaysPerWeek,
            request.WeeklyHoursAvailable,
            request.PlanDurationWeeks,
            request.Level,
            request.TargetEventDate,
            request.PreferredWorkoutMinutes,
            request.ConsiderNonCycling,
            request.PlanMode,
            request.PeriodizationModel,
            request.LongRideDay,
            request.MaxLongRideMinutes,
            request.MesocycleWeeks,
            request.RestDays,
            request.WeekStartDay);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }
}
