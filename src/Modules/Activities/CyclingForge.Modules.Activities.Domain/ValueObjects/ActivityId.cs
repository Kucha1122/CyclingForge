using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Activities.Domain.ValueObjects;

public sealed class ActivityId : ValueObject
{
    public Guid Value { get; }

    public ActivityId(Guid value)
    {
        if (value == Guid.Empty)
            throw new ArgumentException("Activity ID cannot be empty.", nameof(value));

        Value = value;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public static implicit operator Guid(ActivityId id) => id.Value;
    public static implicit operator ActivityId(Guid id) => new(id);
}
