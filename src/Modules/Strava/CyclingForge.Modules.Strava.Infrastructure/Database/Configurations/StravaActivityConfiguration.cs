using CyclingForge.Modules.Strava.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Strava.Infrastructure.Database.Configurations;

internal sealed class StravaActivityConfiguration : IEntityTypeConfiguration<StravaActivity>
{
    public void Configure(EntityTypeBuilder<StravaActivity> builder)
    {
        builder.ToTable("Activities");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.ExternalId).IsRequired();
        builder.Property(a => a.AthleteId).IsRequired();
        builder.Property(a => a.Name).HasMaxLength(256).IsRequired();
        builder.Property(a => a.Type).HasMaxLength(64).IsRequired();
        builder.Property(a => a.StartDate).IsRequired();
        builder.Property(a => a.DeviceWatts).IsRequired(false);
        builder.Property(a => a.StreamsJson).HasColumnType("nvarchar(max)");

        builder.HasIndex(a => a.ExternalId).IsUnique();
        builder.HasIndex(a => a.AthleteId);

        builder.Ignore(a => a.DomainEvents);
    }
}
