namespace CyclingForge.Modules.Users.Application.Queries.GetUser;

public sealed record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    DateTime CreatedAt,
    bool IsActive);
