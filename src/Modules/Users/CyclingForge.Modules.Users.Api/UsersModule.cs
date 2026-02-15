using CyclingForge.Modules.Users.Application;
using CyclingForge.Modules.Users.Infrastructure;
using CyclingForge.Shared.Abstractions.Modules;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Users.Api;

internal sealed class UsersModule : IModule
{
    public string Name => "Users";

    public void Register(IServiceCollection services, IConfiguration configuration)
    {
        services.AddUsersApplication();
        services.AddUsersInfrastructure(configuration);
    }
}
