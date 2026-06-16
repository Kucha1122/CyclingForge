using CyclingForge.Modules.Users.Domain.Entities;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Users.Infrastructure.Database.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id)
            .HasConversion(
                id => id.Value,
                value => new UserId(value));

        builder.Property(u => u.Email)
            .HasConversion(
                email => email.Value,
                value => new Email(value))
            .HasMaxLength(256)
            .IsRequired();

        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.PasswordHash)
            .HasMaxLength(512)
            .IsRequired();

        builder.Property(u => u.FirstName)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(u => u.LastName)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(u => u.CreatedAt).IsRequired();
        builder.Property(u => u.IsActive).IsRequired();

        builder.Property(u => u.FunctionalThresholdPower)
            .IsRequired(false);

        builder.Property(u => u.WeightKg)
            .HasColumnType("decimal(5,2)")
            .IsRequired(false);

        builder.Property(u => u.LactateThresholdHeartRate)
            .IsRequired(false);

        builder.Property(u => u.EftpMinDurationSeconds)
            .IsRequired(false);

        builder.Property(u => u.MaxHeartRate)
            .IsRequired(false);

        builder.Property(u => u.RestingHeartRate)
            .IsRequired(false);

        builder.Property(u => u.Gender)
            .HasMaxLength(16)
            .IsRequired(false);

        builder.Property(u => u.EnableRpeFeedback)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Ignore(u => u.DomainEvents);
    }
}
