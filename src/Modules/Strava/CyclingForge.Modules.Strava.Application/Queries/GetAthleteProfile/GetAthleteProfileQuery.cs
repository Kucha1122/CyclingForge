using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Strava.Application.Queries.GetAthleteProfile;

public sealed record GetAthleteProfileQuery(Guid UserId) : IQuery<AthleteProfileDto>;
