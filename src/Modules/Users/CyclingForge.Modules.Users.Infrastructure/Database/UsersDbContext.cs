using CyclingForge.Modules.Users.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CyclingForge.Modules.Users.Infrastructure.Database;

internal sealed class UsersDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserFtpChange> UserFtpChanges => Set<UserFtpChange>();

    public UsersDbContext(DbContextOptions<UsersDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("users");
        modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
    }
}
