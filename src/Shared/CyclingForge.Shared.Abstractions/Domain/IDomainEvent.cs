using MediatR;

namespace CyclingForge.Shared.Abstractions.Domain;

public interface IDomainEvent : INotification
{
    DateTime OccurredOn => DateTime.UtcNow;
}
