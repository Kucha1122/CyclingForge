using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Workouts.Infrastructure.Database.Configurations;

internal sealed class DailyRecommendationConfiguration : IEntityTypeConfiguration<DailyRecommendation>
{
    public void Configure(EntityTypeBuilder<DailyRecommendation> builder)
    {
        builder.ToTable("DailyRecommendations");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Type)
            .HasConversion(
                t => t.ToString(),
                t => Enum.Parse<RecommendationType>(t))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(r => r.Status)
            .HasConversion(
                s => s.ToString(),
                s => Enum.Parse<RecommendationStatus>(s))
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(r => r.Reason)
            .HasMaxLength(2000);

        builder.Property(r => r.ReadinessScore).HasPrecision(5, 2);

        builder.HasIndex(r => new { r.UserId, r.Date }).IsUnique();

        builder.HasOne(r => r.RecommendedWorkout)
            .WithMany()
            .HasForeignKey(r => r.RecommendedWorkoutId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(r => r.AlternativeWorkout)
            .WithMany()
            .HasForeignKey(r => r.AlternativeWorkoutId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.Ignore(r => r.DomainEvents);
    }
}
