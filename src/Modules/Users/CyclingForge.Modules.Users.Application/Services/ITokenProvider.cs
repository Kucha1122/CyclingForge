namespace CyclingForge.Modules.Users.Application.Services;

public interface ITokenProvider
{
    /// <summary>Generates a signed access token (JWT) and its expiry.</summary>
    GeneratedAccessToken GenerateAccessToken(Guid userId, string email);

    /// <summary>Generates a new cryptographically-random raw refresh token (returned to the client).</summary>
    string GenerateRefreshToken();

    /// <summary>Hashes a raw refresh token (SHA-256) for storage/lookup — the raw token is never persisted.</summary>
    string HashRefreshToken(string rawToken);

    /// <summary>
    /// Expiry for a new refresh token: null (no expiry) when <paramref name="rememberMe"/> is true,
    /// otherwise a short session window from <paramref name="nowUtc"/>.
    /// </summary>
    DateTime? GetRefreshTokenExpiry(bool rememberMe, DateTime nowUtc);
}

public sealed record GeneratedAccessToken(string Token, DateTime ExpiresAtUtc);
