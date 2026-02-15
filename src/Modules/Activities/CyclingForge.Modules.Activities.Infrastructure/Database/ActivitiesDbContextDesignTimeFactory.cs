using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CyclingForge.Modules.Activities.Infrastructure.Database;

internal sealed class ActivitiesDbContextDesignTimeFactory : IDesignTimeDbContextFactory<ActivitiesDbContext>
{
    public ActivitiesDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();
        var bootstrapperPath = Path.Combine(basePath, "src", "Bootstrapper", "CyclingForge.Bootstrapper");
        if (!Directory.Exists(bootstrapperPath))
            bootstrapperPath = basePath;

        var config = new ConfigurationBuilder()
            .SetBasePath(bootstrapperPath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var connectionString = config.GetConnectionString("ActivitiesDb")
            ?? "Server=(localdb)\\mssqllocaldb;Database=CyclingForge_Activities;Trusted_Connection=True;MultipleActiveResultSets=true";

        var optionsBuilder = new DbContextOptionsBuilder<ActivitiesDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new ActivitiesDbContext(optionsBuilder.Options);
    }
}
