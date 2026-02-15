using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Users.Domain.ValueObjects;

namespace CyclingForge.Modules.Users.Domain.Events;

public sealed record UserRegisteredEvent(UserId UserId, Email Email) : IDomainEvent;
