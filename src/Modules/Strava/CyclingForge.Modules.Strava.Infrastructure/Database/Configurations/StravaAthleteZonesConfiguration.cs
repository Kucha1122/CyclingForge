using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Strava.Infrastructure.Database.Configurations;

internal sealed class StravaAthleteZonesConfiguration : IEntityTypeConfiguration<StravaAthleteZones>
{
    public void Configure(EntityTypeBuilder<StravaAthleteZones> builder)
    {
        builder.ToTable("AthleteZones");

        builder.HasKey(z => z.Id);

        builder.Property(z => z.AthleteId)
            .HasConversion(
                id => id.Value,
                value => new StravaAthleteId(value))
            .IsRequired();

        builder.Property(z => z.UserId)
            .IsRequired();

        builder.Property(z => z.HeartRateZonesJson);
        builder.Property(z => z.PowerZonesJson);

        builder.HasIndex(z => z.UserId)
            .IsUnique();

        builder.Ignore(z => z.DomainEvents);
    }
}

