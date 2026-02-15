using CyclingForge.Modules.Users.Application.Commands.Login;
using CyclingForge.Shared.Infrastructure.Auth;

namespace CyclingForge.Modules.Users.Infrastructure.Services;

internal sealed class JwtTokenProvider : ITokenProvider
{
    private readonly JwtTokenService _jwtTokenService;

    public JwtTokenProvider(JwtTokenService jwtTokenService)
    {
        _jwtTokenService = jwtTokenService;
    }

    public string Generate(Guid userId, string email)
        => _jwtTokenService.GenerateToken(userId, email);
}
