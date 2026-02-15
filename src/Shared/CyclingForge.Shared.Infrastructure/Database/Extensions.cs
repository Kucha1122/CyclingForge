using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CyclingForge.Shared.Infrastructure.Database;

public static class Extensions
{
    public static IServiceCollection AddSqlServer<TContext>(
        this IServiceCollection services,
        string connectionString) where TContext : DbContext
    {
        services.AddDbContext<TContext>(options =>
            options.UseSqlServer(connectionString));

        return services;
    }
}
