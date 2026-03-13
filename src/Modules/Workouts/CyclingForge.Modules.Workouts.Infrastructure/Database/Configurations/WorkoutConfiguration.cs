using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Workouts.Infrastructure.Database.Configurations;

internal sealed class WorkoutConfiguration : IEntityTypeConfiguration<Workout>
{
    public void Configure(EntityTypeBuilder<Workout> builder)
    {
        builder.ToTable("Workouts");

        builder.HasKey(w => w.Id);

        builder.Property(w => w.Name)
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(w => w.Description)
            .HasMaxLength(4000);

        builder.Property(w => w.Category)
            .HasConversion(
                c => c.ToString(),
                c => Enum.Parse<WorkoutCategory>(c))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(w => w.Source)
            .HasConversion(
                s => s.ToString(),
                s => Enum.Parse<WorkoutSource>(s))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(w => w.TargetZone)
            .HasConversion(
                z => z.ToString(),
                z => Enum.Parse<TrainingZone>(z))
            .HasMaxLength(16)
            .IsRequired();

        builder.Property(w => w.Tags)
            .HasMaxLength(1000);

        builder.Property(w => w.EstimatedTSS);
        builder.Property(w => w.DurationMinutes);
        builder.Property(w => w.IsPublic);

        builder.HasIndex(w => w.UserId);
        builder.HasIndex(w => w.Category);
        builder.HasIndex(w => new { w.Category, w.DurationMinutes });

        builder.HasMany(w => w.Steps)
            .WithOne()
            .HasForeignKey(s => s.WorkoutId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(w => w.DomainEvents);
    }
}
