using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Strava.Domain.ValueObjects;

namespace CyclingForge.Modules.Strava.Domain.Events;

public sealed record StravaAccountConnectedEvent(Guid UserId, StravaAthleteId AthleteId) : IDomainEvent;
