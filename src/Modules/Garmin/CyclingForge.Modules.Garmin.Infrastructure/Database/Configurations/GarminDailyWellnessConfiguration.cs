using CyclingForge.Modules.Garmin.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Garmin.Infrastructure.Database.Configurations;

internal sealed class GarminDailyWellnessConfiguration : IEntityTypeConfiguration<GarminDailyWellness>
{
    public void Configure(EntityTypeBuilder<GarminDailyWellness> builder)
    {
        builder.ToTable("DailyWellness");

        builder.HasKey(w => w.Id);

        builder.Property(w => w.UserId).IsRequired();
        builder.Property(w => w.Date).IsRequired();

        builder.Property(w => w.TrainingReadinessLevel).HasMaxLength(64);

        builder.HasIndex(w => new { w.UserId, w.Date }).IsUnique();

        builder.Ignore(w => w.DomainEvents);
    }
}
