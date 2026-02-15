using CyclingForge.Shared.Abstractions.Time;
using CyclingForge.Shared.Infrastructure.Auth;
using CyclingForge.Shared.Infrastructure.Exceptions;
using CyclingForge.Shared.Infrastructure.Time;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Shared.Infrastructure;

public static class Extensions
{
    public static IServiceCollection AddSharedInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSingleton<IClock, Clock>();
        services.AddErrorHandling();
        services.AddAuth(configuration);

        return services;
    }
}
