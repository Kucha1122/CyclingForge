using System.Security.Cryptography;
using System.Text;
using CyclingForge.Modules.Users.Application.Services;
using CyclingForge.Shared.Infrastructure.Auth;
using Microsoft.Extensions.Options;

namespace CyclingForge.Modules.Users.Infrastructure.Services;

internal sealed class JwtTokenProvider : ITokenProvider
{
    private readonly JwtTokenService _jwtTokenService;
    private readonly AuthOptions _options;

    public JwtTokenProvider(JwtTokenService jwtTokenService, IOptions<AuthOptions> options)
    {
        _jwtTokenService = jwtTokenService;
        _options = options.Value;
    }

    public GeneratedAccessToken GenerateAccessToken(Guid userId, string email)
    {
        var result = _jwtTokenService.GenerateToken(userId, email);
        return new GeneratedAccessToken(result.Token, result.ExpiresAtUtc);
    }

    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        // URL-safe base64 without padding.
        return Convert.ToBase64String(bytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    public string HashRefreshToken(string rawToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(hash); // 64 hex chars
    }

    public DateTime? GetRefreshTokenExpiry(bool rememberMe, DateTime nowUtc)
        => rememberMe ? null : nowUtc.AddDays(_options.SessionRefreshTokenDays);
}
