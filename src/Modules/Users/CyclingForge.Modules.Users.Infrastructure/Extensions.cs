using CyclingForge.Modules.Users.Application.Commands.Login;
using CyclingForge.Modules.Users.Application.Commands.Register;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Infrastructure.Database;
using CyclingForge.Modules.Users.Infrastructure.Repositories;
using CyclingForge.Modules.Users.Infrastructure.Services;
using CyclingForge.Shared.Infrastructure.Database;
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
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<ITokenProvider, JwtTokenProvider>();

        return services;
    }
}
