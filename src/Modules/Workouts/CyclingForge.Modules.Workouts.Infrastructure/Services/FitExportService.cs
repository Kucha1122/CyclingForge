using System.Collections.Generic;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using Dynastream.Fit;

namespace CyclingForge.Modules.Workouts.Infrastructure.Services;

internal sealed class FitExportService : IFitExportService
{
    public byte[] ExportToFit(Workout workout)
    {
        using var stream = new MemoryStream();
        var encode = new Encode(ProtocolVersion.V20);
        encode.Open(stream);

        var fileId = new FileIdMesg();
        fileId.SetType(Dynastream.Fit.File.Workout);
        fileId.SetManufacturer(Manufacturer.Development);
        fileId.SetProduct(0);
        fileId.SetTimeCreated(new Dynastream.Fit.DateTime(System.DateTime.UtcNow));
        fileId.SetSerialNumber(0);
        encode.Write(fileId);

        var workoutMsg = new WorkoutMesg();
        workoutMsg.SetWktName(workout.Name ?? "Workout");
        if (!string.IsNullOrEmpty(workout.Description))
            workoutMsg.SetWktDescription(workout.Description);
        workoutMsg.SetSport(Sport.Cycling);
        workoutMsg.SetCapabilities(0);
        encode.Write(workoutMsg);

        var allStepMesgs = new List<WorkoutStepMesg>();
        ushort messageIndex = 0;
        foreach (var step in workout.Steps.OrderBy(s => s.Order))
        {
            CreateStepMessages(step, allStepMesgs, ref messageIndex);
        }
        foreach (var m in allStepMesgs)
            encode.Write(m);

        encode.Close();
        return stream.ToArray();
    }

    /// <summary>
    /// Appends step message(s) to the list. Intervals are exported as 3 steps (ON, OFF, repeat marker)
    /// so that duration and repeat count are stored in plain Time steps and repeat_steps only — avoids
    /// SDK/profile issues with RepetitionTime and repeat_time. Import already merges these back into one Intervals step.
    /// </summary>
    private static void CreateStepMessages(WorkoutStep step, List<WorkoutStepMesg> list, ref ushort messageIndex)
    {
        if (step.Type == StepType.Intervals && step.Repeat.HasValue && step.OnDurationSeconds.HasValue && step.OffDurationSeconds.HasValue && step.Repeat > 0)
        {
            // ON step: duration = on duration, power = on power
            var onMsg = new WorkoutStepMesg();
            onMsg.SetMessageIndex(messageIndex++);
            onMsg.SetIntensity(Intensity.Interval);
            onMsg.SetDurationType(WktStepDuration.Time);
            onMsg.SetDurationTime((uint)step.OnDurationSeconds.Value);
            onMsg.SetTargetType(WktStepTarget.Power);
            SetPowerTarget(onMsg, step.OnPower ?? step.PowerHigh, step.OnPower ?? step.PowerHigh);
            list.Add(onMsg);

            // OFF step: duration = off duration, power = off power
            var offMsg = new WorkoutStepMesg();
            offMsg.SetMessageIndex(messageIndex++);
            offMsg.SetIntensity(Intensity.Active);
            offMsg.SetDurationType(WktStepDuration.Time);
            offMsg.SetDurationTime((uint)step.OffDurationSeconds.Value);
            offMsg.SetTargetType(WktStepTarget.Power);
            var offPower = step.OffPower ?? 0.5m;
            SetPowerTarget(offMsg, offPower, offPower);
            list.Add(offMsg);

            // Repeat marker: repeat previous 2 steps N times (no duration_time, no repeat_time)
            var repeatMsg = new WorkoutStepMesg();
            repeatMsg.SetMessageIndex(messageIndex++);
            repeatMsg.SetDurationType(WktStepDuration.RepeatUntilStepsCmplt);
            repeatMsg.SetRepeatSteps((uint)step.Repeat.Value);
            list.Add(repeatMsg);
            return;
        }

        var msg = new WorkoutStepMesg();
        msg.SetMessageIndex(messageIndex++);
        msg.SetIntensity(StepTypeToIntensity(step.Type));
        msg.SetDurationType(WktStepDuration.Time);
        msg.SetDurationTime((uint)step.GetTotalDurationSeconds());

        if (step.Type != StepType.FreeRide)
        {
            msg.SetTargetType(WktStepTarget.Power);
            SetPowerTarget(msg, step.PowerLow, step.PowerHigh);
        }

        list.Add(msg);
    }

    private static void SetPowerTarget(WorkoutStepMesg msg, decimal low, decimal high)
    {
        var lowPercent = FractionToPercent(low);
        var highPercent = FractionToPercent(high);
        msg.SetCustomTargetPowerLow(lowPercent);
        msg.SetCustomTargetPowerHigh(highPercent);
    }

    /// <summary>Converts fraction of FTP (e.g. 1.14 = 114%) to percent for FIT. Allows up to 2000% for sprints/anaerobic.</summary>
    private static uint FractionToPercent(decimal fraction)
    {
        var percent = Math.Round(fraction * 100m);
        return (uint)Math.Clamp(percent, 0, 2000);
    }

    private static Intensity StepTypeToIntensity(StepType type)
    {
        return type switch
        {
            StepType.Warmup => Intensity.Warmup,
            StepType.Cooldown => Intensity.Cooldown,
            StepType.Intervals => Intensity.Interval,
            _ => Intensity.Active
        };
    }
}
