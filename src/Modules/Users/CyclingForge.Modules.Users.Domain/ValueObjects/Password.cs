using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Users.Domain.ValueObjects;

public sealed class Password : ValueObject
{
    public string Value { get; }

    public Password(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length < 8)
            throw new ArgumentException("Password must be at least 8 characters long.", nameof(value));

        Value = value;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }
}
