using CyclingForge.Modules.Activities.Application.Services;
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

        // Register training metrics services
        services.AddScoped<ITrainingMetricsCalculator, TrainingMetricsCalculator>();
        services.AddScoped<IPowerProfileAnalyzer, PowerProfileAnalyzer>();
        services.AddScoped<IEftpEstimator, EftpEstimator>();
        services.AddScoped<IPerformanceManagementService, PerformanceManagementService>();
        services.AddScoped<IActivityLoadCalculator, ActivityLoadCalculator>();

        return services;
    }
}
