using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Garmin.Application;

public static class Extensions
{
    public static IServiceCollection AddGarminApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(Extensions).Assembly));

        services.AddValidatorsFromAssembly(typeof(Extensions).Assembly);

        return services;
    }
}
