using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Activities.Infrastructure.Database.Configurations;

internal sealed class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder.ToTable("Activities");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .HasConversion(
                id => id.Value,
                value => new ActivityId(value));

        builder.Property(a => a.Type)
            .HasConversion(
                type => type.Value,
                value => ActivityType.FromString(value))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(a => a.Distance)
            .HasConversion(
                distance => distance.Meters,
                value => new Distance(value))
            .IsRequired();

        builder.Property(a => a.MovingTime)
            .HasConversion(
                duration => duration.Seconds,
                value => new Duration(value))
            .IsRequired();

        builder.Property(a => a.ElapsedTime)
            .HasConversion(
                duration => duration.Seconds,
                value => new Duration(value))
            .IsRequired();

        builder.Property(a => a.Name).HasMaxLength(512).IsRequired();
        builder.Property(a => a.UserId).IsRequired();
        builder.Property(a => a.StravaActivityId).IsRequired();
        builder.Property(a => a.TotalElevationGain).IsRequired();

        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => new { a.StravaActivityId, a.UserId }).IsUnique();

        builder.Ignore(a => a.DomainEvents);
    }
}
