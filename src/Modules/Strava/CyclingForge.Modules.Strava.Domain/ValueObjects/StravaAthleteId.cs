using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Strava.Domain.ValueObjects;

public sealed class StravaAthleteId : ValueObject
{
    public long Value { get; }

    public StravaAthleteId(long value)
    {
        if (value <= 0)
            throw new ArgumentException("Strava athlete ID must be positive.", nameof(value));

        Value = value;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public static implicit operator long(StravaAthleteId id) => id.Value;
    public static implicit operator StravaAthleteId(long id) => new(id);
}
