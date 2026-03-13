using CyclingForge.Modules.Garmin.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Garmin.Infrastructure.Database.Configurations;

internal sealed class GarminSleepDataConfiguration : IEntityTypeConfiguration<GarminSleepData>
{
    public void Configure(EntityTypeBuilder<GarminSleepData> builder)
    {
        builder.ToTable("SleepData");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.UserId).IsRequired();
        builder.Property(s => s.Date).IsRequired();

        builder.HasIndex(s => new { s.UserId, s.Date }).IsUnique();

        builder.Ignore(s => s.DomainEvents);
    }
}
