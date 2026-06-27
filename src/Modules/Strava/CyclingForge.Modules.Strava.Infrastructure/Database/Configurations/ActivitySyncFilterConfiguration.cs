using CyclingForge.Modules.Strava.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Strava.Infrastructure.Database.Configurations;

internal sealed class ActivitySyncFilterConfiguration : IEntityTypeConfiguration<ActivitySyncFilter>
{
    public void Configure(EntityTypeBuilder<ActivitySyncFilter> builder)
    {
        builder.ToTable("ActivitySyncFilters");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.UserId).IsRequired();
        builder.Property(f => f.ActivityType).HasMaxLength(64).IsRequired();
        builder.Property(f => f.ExcludedDevicePattern).HasMaxLength(256).IsRequired();

        builder.HasIndex(f => f.UserId);

        builder.Ignore(f => f.DomainEvents);
    }
}
