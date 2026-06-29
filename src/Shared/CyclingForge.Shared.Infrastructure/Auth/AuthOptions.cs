namespace CyclingForge.Shared.Infrastructure.Auth;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string SigningKey { get; set; } = string.Empty;

    /// <summary>Access-token lifetime. Kept short — clients silently refresh.</summary>
    public int ExpiryMinutes { get; set; } = 60;

    /// <summary>
    /// Lifetime (days) of a refresh token issued WITHOUT "remember me" — a server-side safety net
    /// for session-only logins. "Remember me" tokens have no expiry (revoked only on logout).
    /// </summary>
    public int SessionRefreshTokenDays { get; set; } = 1;
}
