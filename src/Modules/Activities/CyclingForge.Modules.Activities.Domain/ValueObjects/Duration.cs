using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Activities.Domain.ValueObjects;

public sealed class Duration : ValueObject
{
    public int Seconds { get; }

    public Duration(int seconds)
    {
        if (seconds < 0)
            throw new ArgumentException("Duration cannot be negative.", nameof(seconds));

        Seconds = seconds;
    }

    public TimeSpan ToTimeSpan() => TimeSpan.FromSeconds(Seconds);

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Seconds;
    }
}
