using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Activities.Domain.ValueObjects;

public sealed class Distance : ValueObject
{
    public float Meters { get; }

    public Distance(float meters)
    {
        if (meters < 0)
            throw new ArgumentException("Distance cannot be negative.", nameof(meters));

        Meters = meters;
    }

    public float ToKilometers() => Meters / 1000f;
    public float ToMiles() => Meters / 1609.344f;

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Meters;
    }
}
