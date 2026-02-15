using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Strava.Domain.ValueObjects;

namespace CyclingForge.Modules.Strava.Domain.Entities;

public sealed class StravaAthlete : AggregateRoot<Guid>
{
    public Guid UserId { get; private set; }
    public StravaAthleteId StravaId { get; private set; } = default!;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string? ProfileImageUrl { get; private set; }
    public string? City { get; private set; }
    public string? Country { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    private StravaAthlete() { }

    public static StravaAthlete Create(
        Guid userId,
        StravaAthleteId stravaId,
        string firstName,
        string lastName,
        string? profileImageUrl,
        string? city,
        string? country,
        DateTime createdAt)
    {
        return new StravaAthlete
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StravaId = stravaId,
            FirstName = firstName,
            LastName = lastName,
            ProfileImageUrl = profileImageUrl,
            City = city,
            Country = country,
            CreatedAt = createdAt
        };
    }

    public void UpdateProfile(string firstName, string lastName, string? profileImageUrl, string? city, string? country, DateTime updatedAt)
    {
        FirstName = firstName;
        LastName = lastName;
        ProfileImageUrl = profileImageUrl;
        City = city;
        Country = country;
        UpdatedAt = updatedAt;
    }
}
