using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CyclingForge.Modules.Users.Infrastructure.Database;

internal sealed class UsersDbContextDesignTimeFactory : IDesignTimeDbContextFactory<UsersDbContext>
{
    public UsersDbContext CreateDbContext(string[] args)
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

        var connectionString = config.GetConnectionString("UsersDb")
            ?? "Server=(localdb)\\mssqllocaldb;Database=CyclingForge_Users;Trusted_Connection=True;MultipleActiveResultSets=true";

        var optionsBuilder = new DbContextOptionsBuilder<UsersDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new UsersDbContext(optionsBuilder.Options);
    }
}
