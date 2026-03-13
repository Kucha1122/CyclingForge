using CyclingForge.Modules.Workouts.Application;
using CyclingForge.Modules.Workouts.Infrastructure;
using CyclingForge.Shared.Abstractions.Modules;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Workouts.Api;

internal sealed class WorkoutsModule : IModule
{
    public string Name => "Workouts";

    public void Register(IServiceCollection services, IConfiguration configuration)
    {
        services.AddWorkoutsApplication();
        services.AddWorkoutsInfrastructure(configuration);
    }
}
