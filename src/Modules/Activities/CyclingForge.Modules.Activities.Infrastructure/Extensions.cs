using CyclingForge.Modules.Activities.Application.Commands.SyncActivities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Activities.Infrastructure.Database;
using CyclingForge.Modules.Activities.Infrastructure.Repositories;
using CyclingForge.Modules.Activities.Infrastructure.Services;
using CyclingForge.Shared.Infrastructure.Database;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Activities.Infrastructure;

public static class Extensions
{
    public static IServiceCollection AddActivitiesInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSqlServer<ActivitiesDbContext>(
            configuration.GetConnectionString("ActivitiesDb")!);

        services.AddScoped<IActivityRepository, ActivityRepository>();
        services.AddScoped<IStravaActivitiesService, StravaActivitiesService>();

        return services;
    }

    /// <summary>
    /// Applies pending EF Core migrations for the Activities database at startup.
    /// </summary>
    public static IApplicationBuilder UseActivitiesMigrations(this IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ActivitiesDbContext>();
        context.Database.Migrate();
        return app;
    }
}
