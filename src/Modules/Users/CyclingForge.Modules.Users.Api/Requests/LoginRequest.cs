namespace CyclingForge.Modules.Users.Api.Requests;

public sealed record LoginRequest(string Email, string Password, bool RememberMe = true);
