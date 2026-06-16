using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Garmin.Infrastructure.Database.Configurations;

internal sealed class GarminTokenConfiguration : IEntityTypeConfiguration<GarminToken>
{
    public void Configure(EntityTypeBuilder<GarminToken> builder)
    {
        builder.ToTable("Tokens");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Token)
            .HasConversion(
                token => token.Value,
                value => new AccessToken(value))
            .IsRequired();

        builder.Property(t => t.UserId).IsRequired();
        builder.HasIndex(t => t.UserId).IsUnique();

        builder.Ignore(t => t.DomainEvents);
    }
}
