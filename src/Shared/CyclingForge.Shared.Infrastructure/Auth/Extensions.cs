using System.IdentityModel.Tokens.Jwt;
using System.Text;
using CyclingForge.Shared.Abstractions.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CyclingForge.Shared.Infrastructure.Auth;

public static class Extensions
{
    public static IServiceCollection AddAuth(this IServiceCollection services, IConfiguration configuration)
    {
        JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
        var section = configuration.GetSection(AuthOptions.SectionName);
        services.Configure<AuthOptions>(section);

        var options = section.Get<AuthOptions>()
            ?? throw new InvalidOperationException("Auth configuration is missing.");

        services.AddSingleton<JwtTokenService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddHttpContextAccessor();

        services
            .AddAuthentication(o =>
            {
                o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(o =>
            {
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = options.Issuer,
                    ValidAudience = options.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(options.SigningKey))
                };

                // SignalR's WebSocket transport can't send an Authorization header, so it passes the
                // JWT as an `access_token` query-string parameter. Read it for hub requests.
                o.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/api/hubs"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();

        return services;
    }
}
