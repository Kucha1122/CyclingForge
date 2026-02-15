using System.Reflection;
using CyclingForge.Shared.Abstractions.Modules;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Shared.Infrastructure.Modules;

public static class ModuleLoader
{
    public static IReadOnlyList<IModule> LoadModules(IConfiguration configuration)
    {
        var assemblies = AppDomain.CurrentDomain.GetAssemblies();

        var modules = assemblies
            .SelectMany(a => a.GetTypes())
            .Where(t => typeof(IModule).IsAssignableFrom(t) && t is { IsInterface: false, IsAbstract: false })
            .Select(Activator.CreateInstance)
            .Cast<IModule>()
            .ToList();

        return modules;
    }

    public static IServiceCollection RegisterModules(
        this IServiceCollection services,
        IReadOnlyList<IModule> modules,
        IConfiguration configuration)
    {
        foreach (var module in modules)
        {
            module.Register(services, configuration);
        }

        return services;
    }

    public static IReadOnlyList<Assembly> GetModuleAssemblies()
    {
        return AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => a.FullName?.StartsWith("CyclingForge.Modules") == true)
            .ToList();
    }
}
