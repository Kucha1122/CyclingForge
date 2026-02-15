using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Activities.Application;

public static class Extensions
{
    public static IServiceCollection AddActivitiesApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(Extensions).Assembly));

        services.AddValidatorsFromAssembly(typeof(Extensions).Assembly);

        return services;
    }
}
