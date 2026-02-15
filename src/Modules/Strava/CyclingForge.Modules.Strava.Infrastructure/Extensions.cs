using CyclingForge.Modules.Strava.Application.Services;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Database;
using CyclingForge.Modules.Strava.Infrastructure.Repositories;
using CyclingForge.Modules.Strava.Infrastructure.Services;
using CyclingForge.Shared.Infrastructure.Database;
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
        services.AddScoped<IStravaTokenRepository, StravaTokenRepository>();
        services.AddScoped<IStravaAthleteRepository, StravaAthleteRepository>();

        return services;
    }
}
