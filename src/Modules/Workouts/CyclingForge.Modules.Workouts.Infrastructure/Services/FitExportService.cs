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

        foreach (var step in workout.Steps.OrderBy(s => s.Order))
        {
            var stepMesgs = CreateStepMessages(step);
            foreach (var m in stepMesgs)
                encode.Write(m);
        }

        encode.Close();
        return stream.ToArray();
    }

    private static List<WorkoutStepMesg> CreateStepMessages(WorkoutStep step)
    {
        var list = new List<WorkoutStepMesg>();

        if (step.Type == StepType.Intervals && step.Repeat.HasValue && step.OnDurationSeconds.HasValue && step.OffDurationSeconds.HasValue && step.Repeat > 0)
        {
            var m = new WorkoutStepMesg();
            m.SetMessageIndex((ushort)(step.Order - 1));
            m.SetIntensity(Intensity.Interval);
            m.SetDurationType(WktStepDuration.RepetitionTime);
            m.SetDurationTime((uint)step.OnDurationSeconds.Value);
            m.SetTargetType(WktStepTarget.Power);
            SetPowerTarget(m, step.OnPower ?? step.PowerHigh, step.OnPower ?? step.PowerHigh);
            m.SetRepeatTime((uint)step.OffDurationSeconds.Value);
            m.SetRepeatSteps((uint)step.Repeat.Value);
            if (step.OffPower.HasValue)
                m.SetRepeatPower(FractionToPercent(step.OffPower.Value));
            list.Add(m);
            return list;
        }

        var msg = new WorkoutStepMesg();
        msg.SetMessageIndex((ushort)(step.Order - 1));
        msg.SetIntensity(StepTypeToIntensity(step.Type));
        msg.SetDurationType(WktStepDuration.Time);
        msg.SetDurationTime((uint)step.GetTotalDurationSeconds());

        if (step.Type != StepType.FreeRide)
        {
            msg.SetTargetType(WktStepTarget.Power);
            SetPowerTarget(msg, step.PowerLow, step.PowerHigh);
        }

        list.Add(msg);
        return list;
    }

    private static void SetPowerTarget(WorkoutStepMesg msg, decimal low, decimal high)
    {
        var lowPercent = FractionToPercent(low);
        var highPercent = FractionToPercent(high);
        msg.SetCustomTargetPowerLow(lowPercent);
        msg.SetCustomTargetPowerHigh(highPercent);
    }

    private static uint FractionToPercent(decimal fraction)
    {
        var percent = Math.Round(fraction * 100m);
        return (uint)Math.Clamp(percent, 0, 100);
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
