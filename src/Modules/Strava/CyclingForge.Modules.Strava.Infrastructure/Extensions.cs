using CyclingForge.Modules.Strava.Application.Contracts;
using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Database;
using CyclingForge.Modules.Strava.Infrastructure.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Services;
using CyclingForge.Shared.Infrastructure.Database;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Strava.Infrastructure;

public static class Extensions
{
    public static IServiceCollection AddStravaInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSqlServer<StravaDbContext>(
            configuration.GetConnectionString("StravaDb")!);

        services.Configure<StravaOptions>(
            configuration.GetSection(StravaOptions.SectionName));

        services.AddHttpClient<StravaHttpClient>();
        services.AddScoped<IStravaApiService, StravaApiService>();
        services.AddScoped<IStravaModuleApi, StravaModuleApi>();
        services.AddScoped<IStravaTokenRepository, StravaTokenRepository>();
        services.AddScoped<IStravaAthleteRepository, StravaAthleteRepository>();
        services.AddScoped<IStravaActivityRepository, StravaActivityRepository>();
        services.AddScoped<IStravaAthleteZonesRepository, StravaAthleteZonesRepository>();

        // Webhook ingestion: bounded in-memory queue + background consumer, plus one-shot subscription registration.
        services.AddSingleton<IStravaWebhookQueue, StravaWebhookQueue>();
        services.AddHostedService<StravaWebhookProcessor>();
        services.AddHostedService<StravaWebhookSubscriptionService>();

        return services;
    }

    /// <summary>
    /// Applies pending EF Core migrations for the Strava database at startup.
    /// </summary>
    public static IApplicationBuilder UseStravaMigrations(this IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<StravaDbContext>();
        context.Database.Migrate();
        return app;
    }
}
