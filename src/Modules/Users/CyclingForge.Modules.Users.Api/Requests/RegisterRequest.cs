namespace CyclingForge.Modules.Users.Api.Requests;

public sealed record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName);
