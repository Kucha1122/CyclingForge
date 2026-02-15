using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Users.Domain.ValueObjects;

public sealed class UserId : ValueObject
{
    public Guid Value { get; }

    public UserId(Guid value)
    {
        if (value == Guid.Empty)
            throw new ArgumentException("User ID cannot be empty.", nameof(value));

        Value = value;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public static implicit operator Guid(UserId userId) => userId.Value;
    public static implicit operator UserId(Guid id) => new(id);
}
