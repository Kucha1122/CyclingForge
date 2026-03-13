using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Workouts.Application;

public static class Extensions
{
    public static IServiceCollection AddWorkoutsApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(Extensions).Assembly));

        services.AddValidatorsFromAssembly(typeof(Extensions).Assembly);

        return services;
    }
}
