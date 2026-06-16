using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Workouts.Infrastructure.Database.Configurations;

internal sealed class TrainingPreferenceConfiguration : IEntityTypeConfiguration<TrainingPreference>
{
    public void Configure(EntityTypeBuilder<TrainingPreference> builder)
    {
        builder.ToTable("TrainingPreferences");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Goal)
            .HasConversion(
                g => g.ToString(),
                g => Enum.Parse<TrainingGoal>(g))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(p => p.Level)
            .HasConversion(
                l => l.ToString(),
                l => Enum.Parse<FitnessLevel>(l))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(p => p.PlanMode)
            .HasConversion(
                m => m.ToString(),
                m => Enum.Parse<PlanMode>(m))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(p => p.PeriodizationModel)
            .HasConversion(
                m => m.ToString(),
                m => Enum.Parse<PeriodizationModel>(m))
            .HasMaxLength(64)
            .HasDefaultValue(PeriodizationModel.Auto)
            .IsRequired();

        builder.Property(p => p.WeeklyHoursAvailable).HasPrecision(5, 2);

        builder.Property(p => p.MaxLongRideMinutes)
            .HasDefaultValue(180)
            .IsRequired();

        builder.Property(p => p.MesocycleWeeks)
            .HasDefaultValue(4)
            .IsRequired();

        builder.Property(p => p.RestDays)
            .HasMaxLength(32);

        builder.Property(p => p.WeekStartDay)
            .HasDefaultValue(0)
            .IsRequired();

        builder.HasIndex(p => new { p.UserId, p.IsActive });

        builder.Ignore(p => p.DomainEvents);
    }
}
