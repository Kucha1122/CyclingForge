using CyclingForge.Modules.Garmin.Application;
using CyclingForge.Modules.Garmin.Infrastructure;
using CyclingForge.Shared.Abstractions.Modules;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Garmin.Api;

internal sealed class GarminModule : IModule
{
    public string Name => "Garmin";

    public void Register(IServiceCollection services, IConfiguration configuration)
    {
        services.AddGarminApplication();
        services.AddGarminInfrastructure(configuration);
    }
}
