using CyclingForge.Modules.Garmin.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Garmin.Infrastructure.Database.Configurations;

internal sealed class GarminHrvDataConfiguration : IEntityTypeConfiguration<GarminHrvData>
{
    public void Configure(EntityTypeBuilder<GarminHrvData> builder)
    {
        builder.ToTable("HrvData");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.UserId).IsRequired();
        builder.Property(h => h.Date).IsRequired();

        builder.Property(h => h.Status).HasMaxLength(64);

        builder.HasIndex(h => new { h.UserId, h.Date }).IsUnique();

        builder.Ignore(h => h.DomainEvents);
    }
}
