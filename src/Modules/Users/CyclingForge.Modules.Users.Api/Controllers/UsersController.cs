using CyclingForge.Modules.Users.Application.Commands.Login;
using CyclingForge.Modules.Users.Application.Commands.Register;
using CyclingForge.Modules.Users.Application.Commands.UpdateProfile;
using CyclingForge.Modules.Users.Application.DTOs;
using CyclingForge.Modules.Users.Application.Queries.GetUser;
using CyclingForge.Modules.Users.Api.Requests;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CyclingForge.Modules.Users.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Guid>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var command = new RegisterCommand(request.Email, request.Password, request.FirstName, request.LastName);
        var userId = await _mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetUser), new { userId }, userId);
    }

    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthResultDto>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var command = new LoginCommand(request.Email, request.Password);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDto>> GetUser(
        [FromRoute] Guid userId,
        CancellationToken cancellationToken)
    {
        var query = new GetUserQuery(userId);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpPut("{userId:guid}/profile")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile(
        [FromRoute] Guid userId,
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateProfileCommand(userId, request.Ftp, request.WeightKg, request.Lthr);
        await _mediator.Send(command, cancellationToken);
        return NoContent();
    }
}
