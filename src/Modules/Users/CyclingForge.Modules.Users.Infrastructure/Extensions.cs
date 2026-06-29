using CyclingForge.Modules.Users.Application.Commands.Register;
using CyclingForge.Modules.Users.Application.Services;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Infrastructure.Database;
using CyclingForge.Modules.Users.Infrastructure.Repositories;
using CyclingForge.Modules.Users.Infrastructure.Services;
using CyclingForge.Shared.Infrastructure.Database;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Users.Infrastructure;

public static class Extensions
{
    public static IServiceCollection AddUsersInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSqlServer<UsersDbContext>(
            configuration.GetConnectionString("UsersDb")!);

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IUserFtpChangeRepository, UserFtpChangeRepository>();
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<ITokenProvider, JwtTokenProvider>();

        return services;
    }

    /// <summary>
    /// Applies pending EF Core migrations for the Users database at startup.
    /// </summary>
    public static IApplicationBuilder UseUsersMigrations(this IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<UsersDbContext>();
        context.Database.Migrate();
        return app;
    }
}
