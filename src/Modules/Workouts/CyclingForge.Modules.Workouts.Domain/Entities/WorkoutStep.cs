using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Shared.Abstractions.Domain;

namespace CyclingForge.Modules.Workouts.Domain.Entities;

public sealed class WorkoutStep : Entity<Guid>
{
    public Guid WorkoutId { get; private set; }
    public int Order { get; private set; }
    public StepType Type { get; private set; }
    public int DurationSeconds { get; private set; }
    public decimal PowerLow { get; private set; }
    public decimal PowerHigh { get; private set; }
    public int? Cadence { get; private set; }
    public int? Repeat { get; private set; }
    public int? OnDurationSeconds { get; private set; }
    public int? OffDurationSeconds { get; private set; }
    public decimal? OnPower { get; private set; }
    public decimal? OffPower { get; private set; }

    private WorkoutStep() { }

    public static WorkoutStep Create(
        Guid workoutId,
        int order,
        StepType type,
        int durationSeconds,
        decimal powerLow,
        decimal powerHigh,
        int? cadence = null,
        int? repeat = null,
        int? onDurationSeconds = null,
        int? offDurationSeconds = null,
        decimal? onPower = null,
        decimal? offPower = null)
    {
        return new WorkoutStep
        {
            Id = Guid.NewGuid(),
            WorkoutId = workoutId,
            Order = order,
            Type = type,
            DurationSeconds = durationSeconds,
            PowerLow = powerLow,
            PowerHigh = powerHigh,
            Cadence = cadence,
            Repeat = repeat,
            OnDurationSeconds = onDurationSeconds,
            OffDurationSeconds = offDurationSeconds,
            OnPower = onPower,
            OffPower = offPower
        };
    }

    public void Update(
        int order,
        StepType type,
        int durationSeconds,
        decimal powerLow,
        decimal powerHigh,
        int? cadence,
        int? repeat,
        int? onDurationSeconds,
        int? offDurationSeconds,
        decimal? onPower,
        decimal? offPower)
    {
        Order = order;
        Type = type;
        DurationSeconds = durationSeconds;
        PowerLow = powerLow;
        PowerHigh = powerHigh;
        Cadence = cadence;
        Repeat = repeat;
        OnDurationSeconds = onDurationSeconds;
        OffDurationSeconds = offDurationSeconds;
        OnPower = onPower;
        OffPower = offPower;
    }

    public int GetTotalDurationSeconds()
    {
        if (Type == StepType.Intervals && Repeat.HasValue && OnDurationSeconds.HasValue && OffDurationSeconds.HasValue)
            return Repeat.Value * (OnDurationSeconds.Value + OffDurationSeconds.Value);

        return DurationSeconds;
    }

    public decimal GetWeightedPower()
    {
        if (Type == StepType.Intervals && OnPower.HasValue && OffPower.HasValue
            && OnDurationSeconds.HasValue && OffDurationSeconds.HasValue && Repeat.HasValue)
        {
            var totalOn = Repeat.Value * OnDurationSeconds.Value;
            var totalOff = Repeat.Value * OffDurationSeconds.Value;
            var totalDur = totalOn + totalOff;
            if (totalDur == 0) return 0;
            return (OnPower.Value * totalOn + OffPower.Value * totalOff) / totalDur;
        }

        if (Type == StepType.Ramp || Type == StepType.Warmup || Type == StepType.Cooldown)
            return (PowerLow + PowerHigh) / 2m;

        return PowerHigh;
    }
}
