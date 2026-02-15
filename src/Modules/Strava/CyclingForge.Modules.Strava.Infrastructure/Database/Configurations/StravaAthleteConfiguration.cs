using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Strava.Infrastructure.Database.Configurations;

internal sealed class StravaAthleteConfiguration : IEntityTypeConfiguration<StravaAthlete>
{
    public void Configure(EntityTypeBuilder<StravaAthlete> builder)
    {
        builder.ToTable("Athletes");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.StravaId)
            .HasConversion(
                id => id.Value,
                value => new StravaAthleteId(value))
            .IsRequired();

        builder.Property(a => a.FirstName).HasMaxLength(128).IsRequired();
        builder.Property(a => a.LastName).HasMaxLength(128).IsRequired();
        builder.Property(a => a.ProfileImageUrl).HasMaxLength(1024);
        builder.Property(a => a.City).HasMaxLength(128);
        builder.Property(a => a.Country).HasMaxLength(128);
        builder.Property(a => a.UserId).IsRequired();

        builder.HasIndex(a => a.UserId).IsUnique();
        builder.HasIndex(a => a.StravaId).IsUnique();

        builder.Ignore(a => a.DomainEvents);
    }
}
