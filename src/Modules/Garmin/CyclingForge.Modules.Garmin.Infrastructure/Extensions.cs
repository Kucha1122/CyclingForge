using CyclingForge.Modules.Garmin.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Infrastructure.Database;
using CyclingForge.Modules.Garmin.Infrastructure.Repositories;
using CyclingForge.Modules.Garmin.Infrastructure.Services;
using CyclingForge.Shared.Infrastructure.Database;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Garmin.Infrastructure;

public static class Extensions
{
    public static IServiceCollection AddGarminInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSqlServer<GarminDbContext>(
            configuration.GetConnectionString("GarminDb")!);

        services.Configure<GarminOptions>(
            configuration.GetSection(GarminOptions.SectionName));

        services.AddHttpClient<GarminHttpClient>();
        services.AddScoped<IGarminApiService, GarminApiService>();
        services.AddScoped<IGarminTokenRepository, GarminTokenRepository>();
        services.AddScoped<IGarminSleepRepository, GarminSleepRepository>();
        services.AddScoped<IGarminWellnessRepository, GarminWellnessRepository>();

        return services;
    }

    public static IApplicationBuilder UseGarminMigrations(this IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GarminDbContext>();
        context.Database.Migrate();
        return app;
    }
}
