using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Modules.Workouts.Infrastructure.Configuration;
using CyclingForge.Modules.Workouts.Infrastructure.Database;
using CyclingForge.Modules.Workouts.Infrastructure.Repositories;
using CyclingForge.Modules.Workouts.Infrastructure.Services;
using CyclingForge.Shared.Infrastructure.Database;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Modules.Workouts.Infrastructure;

public static class Extensions
{
    public static IServiceCollection AddWorkoutsInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSqlServer<WorkoutsDbContext>(
            configuration.GetConnectionString("WorkoutsDb")!);

        services.Configure<WorkoutSeedOptions>(
            configuration.GetSection(WorkoutSeedOptions.SectionName));

        services.AddScoped<IWorkoutRepository, WorkoutRepository>();
        services.AddScoped<ITrainingPreferenceRepository, TrainingPreferenceRepository>();
        services.AddScoped<IDailyRecommendationRepository, DailyRecommendationRepository>();
        services.AddScoped<IZwoImportService, ZwoImportService>();
        services.AddScoped<IFitImportService, FitImportService>();
        services.AddScoped<IZwiftSeedService, ZwiftSeedService>();

        return services;
    }

    public static IApplicationBuilder UseWorkoutsMigrations(this IApplicationBuilder app)
    {
        using var scope = app.ApplicationServices.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<WorkoutsDbContext>();
        context.Database.Migrate();
        return app;
    }
}
