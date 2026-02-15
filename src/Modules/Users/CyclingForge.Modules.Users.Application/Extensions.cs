using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Users.Application;

public static class Extensions
{
    public static IServiceCollection AddUsersApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(Extensions).Assembly));

        services.AddValidatorsFromAssembly(typeof(Extensions).Assembly);

        return services;
    }
}
