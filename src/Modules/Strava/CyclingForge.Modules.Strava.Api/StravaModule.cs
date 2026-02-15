using CyclingForge.Modules.Strava.Application;
using CyclingForge.Modules.Strava.Infrastructure;
using CyclingForge.Shared.Abstractions.Modules;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Strava.Api;

internal sealed class StravaModule : IModule
{
    public string Name => "Strava";

    public void Register(IServiceCollection services, IConfiguration configuration)
    {
        services.AddStravaApplication();
        services.AddStravaInfrastructure(configuration);
    }
}
