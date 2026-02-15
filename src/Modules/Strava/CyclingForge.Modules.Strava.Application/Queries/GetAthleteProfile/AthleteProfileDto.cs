namespace CyclingForge.Modules.Strava.Application.Queries.GetAthleteProfile;

public sealed record AthleteProfileDto(
    long StravaAthleteId,
    string FirstName,
    string LastName,
    string? ProfileImageUrl,
    string? City,
    string? Country);
