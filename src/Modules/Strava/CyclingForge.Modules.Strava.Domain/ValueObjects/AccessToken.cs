using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Strava.Domain.ValueObjects;

public sealed class AccessToken : ValueObject
{
    public string Value { get; }

    public AccessToken(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Access token cannot be empty.", nameof(value));

        Value = value;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public static implicit operator string(AccessToken token) => token.Value;
    public static implicit operator AccessToken(string token) => new(token);
}
