using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Workouts.Infrastructure.Database.Configurations;

internal sealed class WorkoutStepConfiguration : IEntityTypeConfiguration<WorkoutStep>
{
    public void Configure(EntityTypeBuilder<WorkoutStep> builder)
    {
        builder.ToTable("WorkoutSteps");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Type)
            .HasConversion(
                t => t.ToString(),
                t => Enum.Parse<StepType>(t))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(s => s.PowerLow).HasPrecision(5, 3);
        builder.Property(s => s.PowerHigh).HasPrecision(5, 3);
        builder.Property(s => s.OnPower).HasPrecision(5, 3);
        builder.Property(s => s.OffPower).HasPrecision(5, 3);

        builder.HasIndex(s => new { s.WorkoutId, s.Order });

        builder.Ignore(s => s.DomainEvents);
    }
}
