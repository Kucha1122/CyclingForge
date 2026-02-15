using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Activities.Domain.ValueObjects;

namespace CyclingForge.Modules.Activities.Domain.Events;

public sealed record ActivitySyncedEvent(ActivityId ActivityId, Guid UserId, long StravaActivityId) : IDomainEvent;
