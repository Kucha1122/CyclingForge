using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CyclingForge.Shared.Abstractions.Time;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CyclingForge.Shared.Infrastructure.Auth;

public sealed class JwtTokenService
{
    private readonly AuthOptions _options;
    private readonly IClock _clock;

    public JwtTokenService(IOptions<AuthOptions> options, IClock clock)
    {
        _options = options.Value;
        _clock = clock;
    }

    public string GenerateToken(Guid userId, string email)
    {
        var now = _clock.CurrentDate();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(_options.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
