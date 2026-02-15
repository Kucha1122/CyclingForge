namespace CyclingForge.Shared.Abstractions.Domain;

public abstract class AggregateRoot<TId> : Entity<TId> where TId : notnull
{
    public int Version { get; protected set; }

    protected void IncrementVersion()
        => Version++;
}
