using CyclingForge.Modules.Garmin.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Garmin.Infrastructure.Database.Configurations;

internal sealed class GarminSyncPreferenceConfiguration : IEntityTypeConfiguration<GarminSyncPreference>
{
    public void Configure(EntityTypeBuilder<GarminSyncPreference> builder)
    {
        builder.ToTable("SyncPreferences");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.UserId).IsRequired();
        builder.HasIndex(p => p.UserId).IsUnique();

        builder.Property(p => p.SyncTimesRaw).HasMaxLength(256).IsRequired();
        builder.Property(p => p.TimeZoneId).HasMaxLength(128).IsRequired();
        builder.Property(p => p.Enabled).IsRequired();

        builder.Ignore(p => p.DomainEvents);
    }
}
