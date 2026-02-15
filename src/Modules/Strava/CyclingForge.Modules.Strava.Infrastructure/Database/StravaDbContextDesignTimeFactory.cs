using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CyclingForge.Modules.Strava.Infrastructure.Database;

internal sealed class StravaDbContextDesignTimeFactory : IDesignTimeDbContextFactory<StravaDbContext>
{
    public StravaDbContext CreateDbContext(string[] args)
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

        var connectionString = config.GetConnectionString("StravaDb")
            ?? "Server=(localdb)\\mssqllocaldb;Database=CyclingForge_Strava;Trusted_Connection=True;MultipleActiveResultSets=true";

        var optionsBuilder = new DbContextOptionsBuilder<StravaDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new StravaDbContext(optionsBuilder.Options);
    }
}
