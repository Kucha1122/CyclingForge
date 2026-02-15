using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Activities.Domain.ValueObjects;

public sealed class ActivityType : ValueObject
{
    public static readonly ActivityType Ride = new("Ride");
    public static readonly ActivityType VirtualRide = new("VirtualRide");
    public static readonly ActivityType Run = new("Run");
    public static readonly ActivityType Walk = new("Walk");
    public static readonly ActivityType Swim = new("Swim");
    public static readonly ActivityType Other = new("Other");

    public string Value { get; }

    public ActivityType(string value)
    {
        Value = value ?? throw new ArgumentNullException(nameof(value));
    }

    public static ActivityType FromString(string type) => type switch
    {
        "Ride" => Ride,
        "VirtualRide" => VirtualRide,
        "Run" => Run,
        "Walk" => Walk,
        "Swim" => Swim,
        _ => new ActivityType(type)
    };

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public static implicit operator string(ActivityType type) => type.Value;
}
