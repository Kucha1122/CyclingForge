using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Modules.Users.Domain.Events;

namespace CyclingForge.Modules.Users.Domain.Entities;

public sealed class User : AggregateRoot<UserId>
{
    public Email Email { get; private set; } = default!;
    public string PasswordHash { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastLoginAt { get; private set; }
    public bool IsActive { get; private set; }
    public int? FunctionalThresholdPower { get; private set; }
    public float? WeightKg { get; private set; }
    public int? LactateThresholdHeartRate { get; private set; }
    public int? MaxHeartRate { get; private set; }
    public int? RestingHeartRate { get; private set; }
    public string Gender { get; private set; } = "male";
    /// <summary>Minimum effort duration (seconds) used for eFTP estimation; null = default 300 (5 min). Valid range 180–1800 (intervals.icu).</summary>
    public int? EftpMinDurationSeconds { get; private set; }

    private User() { }

    public static User Create(Email email, string passwordHash, string firstName, string lastName, DateTime createdAt)
    {
        var user = new User
        {
            Id = new UserId(Guid.NewGuid()),
            Email = email,
            PasswordHash = passwordHash,
            FirstName = firstName,
            LastName = lastName,
            CreatedAt = createdAt,
            IsActive = true
        };

        user.AddDomainEvent(new UserRegisteredEvent(user.Id, user.Email));
        return user;
    }

    public void UpdateLastLogin(DateTime loginDate)
    {
        LastLoginAt = loginDate;
    }

    public void UpdateFtp(int ftp)
    {
        if (ftp <= 0)
            throw new ArgumentException("FTP must be greater than 0", nameof(ftp));
        
        FunctionalThresholdPower = ftp;
    }

    public void UpdateWeight(float weightKg)
    {
        if (weightKg <= 0)
            throw new ArgumentException("Weight must be greater than 0", nameof(weightKg));
        
        WeightKg = weightKg;
    }

    public void UpdateProfile(int? ftp, float? weightKg, int? lthr = null, int? eftpMinDurationSeconds = null, int? maxHr = null, int? restingHr = null, string? gender = null)
    {
        if (ftp.HasValue)
        {
            if (ftp.Value <= 0)
                throw new ArgumentException("FTP must be greater than 0", nameof(ftp));
            FunctionalThresholdPower = ftp.Value;
        }

        if (weightKg.HasValue)
        {
            if (weightKg.Value <= 0)
                throw new ArgumentException("Weight must be greater than 0", nameof(weightKg));
            WeightKg = weightKg.Value;
        }

        if (lthr.HasValue)
        {
            if (lthr.Value <= 0)
                throw new ArgumentException("LTHR must be greater than 0", nameof(lthr));
            LactateThresholdHeartRate = lthr.Value;
        }

        if (maxHr.HasValue)
        {
            if (maxHr.Value <= 0)
                throw new ArgumentException("Max HR must be greater than 0", nameof(maxHr));
            MaxHeartRate = maxHr.Value;
        }

        if (restingHr.HasValue)
        {
            if (restingHr.Value <= 0)
                throw new ArgumentException("Resting HR must be greater than 0", nameof(restingHr));
            RestingHeartRate = restingHr.Value;
        }

        if (!string.IsNullOrEmpty(gender))
        {
            Gender = gender.ToLowerInvariant();
        }

        if (eftpMinDurationSeconds.HasValue)
        {
            if (eftpMinDurationSeconds.Value == 0)
                EftpMinDurationSeconds = null;
            else if (eftpMinDurationSeconds.Value < 180 || eftpMinDurationSeconds.Value > 1800)
                throw new ArgumentException("EftpMinDurationSeconds must be null, 0, or between 180 and 1800 (3–30 min).", nameof(eftpMinDurationSeconds));
            else
                EftpMinDurationSeconds = eftpMinDurationSeconds.Value;
        }
    }
}
