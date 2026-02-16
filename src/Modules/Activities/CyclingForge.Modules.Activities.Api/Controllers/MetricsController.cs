using CyclingForge.Modules.Activities.Application.Queries.GetDailyTss;
using CyclingForge.Modules.Activities.Application.Queries.GetPmcSummary;
using CyclingForge.Modules.Activities.Application.Queries.GetWeeklySummary;
using CyclingForge.Modules.Activities.Application.Queries.GetMonthlySummary;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CyclingForge.Modules.Activities.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class MetricsController : ControllerBase
{
    private readonly IMediator _mediator;

    public MetricsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("pmc")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPmcSummary(
        [FromQuery] int? ctlDays,
        [FromQuery] int? atlDays,
        [FromQuery] int? historyDays,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var query = new GetPmcSummaryQuery(userId, ctlDays ?? 42, atlDays ?? 7, historyDays ?? 90);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("daily-tss")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetDailyTss(
        [FromQuery] int? days,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var query = new GetDailyTssQuery(userId, days ?? 30);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("weekly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetWeeklySummary(
        [FromQuery] DateTime? weekStart,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var query = new GetWeeklySummaryQuery(userId, weekStart);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("monthly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMonthlySummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var query = new GetMonthlySummaryQuery(userId, year, month);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
