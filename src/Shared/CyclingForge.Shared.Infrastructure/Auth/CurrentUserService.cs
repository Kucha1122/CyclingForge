using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CyclingForge.Shared.Abstractions.Auth;
using Microsoft.AspNetCore.Http;

namespace CyclingForge.Shared.Infrastructure.Auth;

public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid UserId
    {
        get
        {
            var sub = _httpContextAccessor.HttpContext?.User
                .FindFirstValue(JwtRegisteredClaimNames.Sub);

            return sub is not null ? Guid.Parse(sub) : Guid.Empty;
        }
    }

    public string Email =>
        _httpContextAccessor.HttpContext?.User
            .FindFirstValue(JwtRegisteredClaimNames.Email) ?? string.Empty;

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}
