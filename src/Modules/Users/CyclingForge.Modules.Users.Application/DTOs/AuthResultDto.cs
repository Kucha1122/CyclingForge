namespace CyclingForge.Modules.Users.Application.DTOs;

public sealed record AuthResultDto(
    string Token,
    string RefreshToken,
    Guid UserId,
    string Email,
    DateTime AccessTokenExpiresAtUtc);
