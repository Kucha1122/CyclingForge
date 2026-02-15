using CyclingForge.Shared.Abstractions.Time;

namespace CyclingForge.Shared.Infrastructure.Time;

public sealed class Clock : IClock
{
    public DateTime CurrentDate() => DateTime.UtcNow;
}
