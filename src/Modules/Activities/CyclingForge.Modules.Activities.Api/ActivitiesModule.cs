using CyclingForge.Modules.Activities.Application;
using CyclingForge.Modules.Activities.Infrastructure;
using CyclingForge.Shared.Abstractions.Modules;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Activities.Api;

internal sealed class ActivitiesModule : IModule
{
    public string Name => "Activities";

    public void Register(IServiceCollection services, IConfiguration configuration)
    {
        services.AddActivitiesApplication();
        services.AddActivitiesInfrastructure(configuration);
    }
}
