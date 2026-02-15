namespace CyclingForge.Modules.Users.Application.DTOs;

public sealed record AuthResultDto(string Token, Guid UserId, string Email);
