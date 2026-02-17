using CyclingForge.Modules.Users.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CyclingForge.Modules.Users.Infrastructure.Database.Configurations;

internal sealed class UserFtpChangeConfiguration : IEntityTypeConfiguration<UserFtpChange>
{
    public void Configure(EntityTypeBuilder<UserFtpChange> builder)
    {
        builder.ToTable("UserFtpChanges");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.EffectiveDate).IsRequired();
        builder.Property(x => x.FtpValue).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(32).IsRequired();

        builder.HasIndex(x => new { x.UserId, x.EffectiveDate });
    }
}
