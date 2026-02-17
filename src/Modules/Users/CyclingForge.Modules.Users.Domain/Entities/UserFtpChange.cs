namespace CyclingForge.Modules.Users.Domain.Entities;

/// <summary>
/// Records a point-in-time FTP value for a user (manual change or estimated from activity).
/// Used to compute effective FTP on a given date for PMC/TSS calculations.
/// </summary>
public sealed class UserFtpChange
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime EffectiveDate { get; private set; }
    public int FtpValue { get; private set; }
    public string Source { get; private set; } = string.Empty; // "Manual" | "EstimatedFromActivity"

    private UserFtpChange() { }

    public static UserFtpChange Create(Guid userId, DateTime effectiveDate, int ftpValue, string source)
    {
        if (ftpValue <= 0)
            throw new ArgumentException("FTP must be greater than 0", nameof(ftpValue));
        if (string.IsNullOrEmpty(source))
            throw new ArgumentException("Source is required", nameof(source));

        return new UserFtpChange
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EffectiveDate = effectiveDate,
            FtpValue = ftpValue,
            Source = source
        };
    }
}
