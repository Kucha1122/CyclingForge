using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Strava.Infrastructure.Database.Configurations;

internal sealed class StravaTokenConfiguration : IEntityTypeConfiguration<StravaToken>
{
    public void Configure(EntityTypeBuilder<StravaToken> builder)
    {
        builder.ToTable("Tokens");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.AthleteId)
            .HasConversion(
                id => id.Value,
                value => new StravaAthleteId(value))
            .IsRequired();

        builder.Property(t => t.Token)
            .HasConversion(
                token => token.Value,
                value => new AccessToken(value))
            .HasMaxLength(512)
            .IsRequired();

        builder.Property(t => t.RefreshToken)
            .HasMaxLength(512)
            .IsRequired();

        builder.Property(t => t.UserId).IsRequired();
        builder.HasIndex(t => t.UserId).IsUnique();

        builder.Ignore(t => t.DomainEvents);
    }
}
