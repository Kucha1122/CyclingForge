using System.Collections.Generic;
using System.Reflection;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using Dynastream.Fit;

namespace CyclingForge.Modules.Workouts.Infrastructure.Services;

internal sealed class FitImportService : IFitImportService
{
    public Workout ParseFit(Stream fitStream, Guid? userId, System.DateTime createdAt, int? userFtpWatts = null)
    {
        var decode = new Decode();
        var fileIdMessages = new List<FileIdMesg>();
        var workoutMessages = new List<WorkoutMesg>();
        var workoutStepMessages = new List<WorkoutStepMesg>();

        decode.MesgEvent += (_, e) =>
        {
            var mesg = GetMesgFromEventArgs(e);
            if (mesg is null) return;

            switch (mesg.Num)
            {
                case MesgNum.FileId:
                    fileIdMessages.Add(new FileIdMesg(mesg));
                    break;
                case MesgNum.Workout:
                    workoutMessages.Add(new WorkoutMesg(mesg));
                    break;
                case MesgNum.WorkoutStep:
                    workoutStepMessages.Add(new WorkoutStepMesg(mesg));
                    break;
            }
        };

        if (!decode.IsFIT(fitStream))
            throw new InvalidOperationException("The file is not a valid FIT file.");
        if (!decode.CheckIntegrity(fitStream))
            throw new InvalidOperationException("The FIT file is corrupt or invalid.");

        fitStream.Position = 0;
        if (!decode.Read(fitStream))
            throw new InvalidOperationException("Failed to read the FIT file.");

        var fileId = fileIdMessages.FirstOrDefault();
        if (fileId is null)
            throw new InvalidOperationException("The FIT file has no file identifier.");
        var fileType = GetFileTypeFromFileId(fileId);
        if (!fileType.HasValue || fileType.Value != (byte)Dynastream.Fit.File.Workout)
            throw new InvalidOperationException(
                "This is an activity file (recorded ride), not a workout plan. Import only FIT workout files (.fit).");

        var workoutMsg = workoutMessages.FirstOrDefault();
        var name = GetWorkoutMesgString(workoutMsg, () => workoutMsg!.GetWktNameAsString(), "Imported Workout");
        var description = GetWorkoutMesgString(workoutMsg, () => workoutMsg!.GetWktDescriptionAsString(), string.Empty);

        var workout = Workout.Create(
            userId,
            name ?? "Imported Workout",
            description ?? string.Empty,
            WorkoutCategory.Mixed,
            userId.HasValue ? WorkoutSource.Imported : WorkoutSource.System,
            TrainingZone.Z3,
            false,
            null,
            createdAt);

        // Exclude Zwift repeat markers (no duration_time) so we have the real step list for type inference
        var realSteps = workoutStepMessages
            .Where(s => !IsRepeatMarker(s))
            .ToList();

        int? ftpForConversion = InferExportFtpFromFirstStep(realSteps) ?? userFtpWatts;

        var order = 0;
        var stepsToAdd = new List<WorkoutStep>();
        for (var i = 0; i < workoutStepMessages.Count; i++)
        {
            var stepMsg = workoutStepMessages[i];
            if (IsRepeatMarker(stepMsg))
            {
                // Zwift: repeat marker means "repeat the previous 2 steps (on/off pair)" N times → one Intervals step
                var repeatCount = (int)(stepMsg.GetRepeatSteps() ?? stepMsg.GetTargetValue() ?? 1);
                if (repeatCount < 1) repeatCount = 1;
                if (stepsToAdd.Count >= 2)
                {
                    var s1 = stepsToAdd[stepsToAdd.Count - 2];
                    var s2 = stepsToAdd[stepsToAdd.Count - 1];
                    stepsToAdd.RemoveRange(stepsToAdd.Count - 2, 2);
                    var onDur = s1.DurationSeconds;
                    var offDur = s2.DurationSeconds;
                    var onPow = (s1.PowerLow + s1.PowerHigh) / 2m;
                    var offPow = (s2.PowerLow + s2.PowerHigh) / 2m;
                    var totalDur = repeatCount * (onDur + offDur);
                    order++;
                    var merged = WorkoutStep.Create(
                        workout.Id, order, StepType.Intervals,
                        totalDur, offPow, onPow, null,
                        repeatCount, onDur, offDur, onPow, offPow);
                    stepsToAdd.Add(merged);
                }
                continue;
            }

            var realIndex = realSteps.IndexOf(stepMsg);
            var steps = MapWorkoutStep(stepMsg, workout.Id, ref order, ftpForConversion,
                stepIndexAmongReal: realIndex >= 0 ? realIndex : (int?)null,
                totalRealSteps: realSteps.Count);
            foreach (var step in steps)
                stepsToAdd.Add(step);
        }

        // Renumber order 1..n and add to workout
        for (var i = 0; i < stepsToAdd.Count; i++)
        {
            var s = stepsToAdd[i];
            s.Update(i + 1, s.Type, s.DurationSeconds, s.PowerLow, s.PowerHigh, s.Cadence,
                s.Repeat, s.OnDurationSeconds, s.OffDurationSeconds, s.OnPower, s.OffPower);
            workout.AddStep(s);
        }

        var category = ClassifyWorkout(workout);
        var targetZone = DetermineTargetZone(workout);
        workout.Update(
            workout.Name,
            workout.Description,
            category,
            targetZone,
            workout.IsPublic,
            workout.Tags,
            createdAt);

        return workout;
    }

    /// <summary>
    /// Converts FIT power target value to fraction of FTP (0–1).
    /// Supports: percent 0–100, Garmin scale 0–1000 (e.g. 950 = 95%), raw 0–10000.
    /// </summary>
    private static decimal PowerValueToFraction(uint value)
    {
        if (value <= 0) return 0m;
        if (value <= 100)
            return Math.Clamp(value / 100m, 0m, 2m);       // percent 0–100 (65 → 0.65)
        if (value <= 1000)
            return Math.Clamp(value / 1000m, 0m, 2m);        // Garmin 0–1000 (950 → 0.95)
        return Math.Clamp(value / 10000m, 0m, 2m);         // raw (6500 → 0.65)
    }

    /// <summary>
    /// Zwift FIT encoding: percent FTP = (raw - 993) / 2.6; fraction = (raw - 993) / 260.
    /// Subtract 1% so displayed values match common FIT tools (avoid systematic +1%).
    /// </summary>
    private static decimal? ZwiftCustomTargetToFraction(uint raw)
    {
        if (raw < 500 || raw > 2000) return null;
        return Math.Clamp((raw - 993m) / 260m - 0.01m, 0m, 2m);
    }

    /// <summary>
    /// Gets power as fraction of FTP from a workout step message field.
    /// Uses Zwift encoding (raw - 993) / 260 when raw is in 500–2000 range; otherwise fallbacks.
    /// </summary>
    private static decimal? GetPowerFractionFromField(WorkoutStepMesg stepMsg, string fieldName, int? userFtpWatts = null)
    {
        try
        {
            var fieldsProp = typeof(Mesg).GetProperty("Fields", BindingFlags.Public | BindingFlags.Instance);
            var fields = fieldsProp?.GetValue(stepMsg) as System.Collections.IEnumerable;
            if (fields is null) return null;

            foreach (var f in fields)
            {
                if (f is null) continue;
                var nameProp = f.GetType().GetProperty("Name", BindingFlags.Public | BindingFlags.Instance);
                var name = nameProp?.GetValue(f) as string;
                if (string.IsNullOrEmpty(name) || !name.Contains(fieldName, StringComparison.OrdinalIgnoreCase))
                    continue;

                var getRaw = f.GetType().GetMethod("GetRawValue", [typeof(int)]);
                var raw = getRaw?.Invoke(f, [0]);
                var rawNum = raw is uint ru ? ru : (raw is int ri ? (uint)ri : (raw is long rl ? (uint)rl : 0));

                // Zwift FIT (Intervals.icu): custom target value = (raw - 993) / 2.6 → % FTP; fraction = (raw - 993) / 260
                var zwiftFraction = ZwiftCustomTargetToFraction(rawNum);
                if (zwiftFraction.HasValue)
                    return zwiftFraction.Value;

                var scaleProp = f.GetType().GetProperty("Scale", BindingFlags.Public | BindingFlags.Instance);
                var scale = scaleProp?.GetValue(f);
                var scaleNum = scale is float sf ? (decimal)sf : (scale is double sd ? (decimal)sd : (scale is int si ? si : scale is uint ui ? ui : 0));
                if (scaleNum <= 0 || (scaleNum == 1 && rawNum > 100))
                    return Math.Clamp(rawNum / 1000m, 0m, 2m);
                return Math.Clamp((rawNum / scaleNum) / 100m, 0m, 2m);
            }
        }
        catch
        {
            // ignore
        }

        return null;
    }

    /// <summary>
    /// Maps FIT power zone (1–7) to approximate fraction of FTP (Coggan-style zones).
    /// </summary>
    private static decimal PowerZoneToFraction(uint zone)
    {
        return zone switch
        {
            1 => 0.50m,   // Z1 Recovery
            2 => 0.65m,   // Z2 Endurance
            3 => 0.83m,   // Z3 Tempo
            4 => 0.98m,   // Z4 Threshold
            5 => 1.13m,   // Z5 VO2max
            6 => 1.35m,   // Z6 Anaerobic
            7 => 1.35m,   // Z7 (same as Z6 or neuromuscular)
            _ => 0.65m
        };
    }

    /// <summary>Reads the FIT file type (e.g. File.Workout = 5) from FileIdMesg. C# GetType() returns System.Type, so we read the Type field via reflection.</summary>
    private static byte? GetFileTypeFromFileId(FileIdMesg fileId)
    {
        try
        {
            var fieldsProp = typeof(Mesg).GetProperty("Fields", BindingFlags.Public | BindingFlags.Instance);
            var fields = fieldsProp?.GetValue(fileId) as System.Collections.IEnumerable;
            if (fields is null) return null;
            foreach (var f in fields)
            {
                if (f is null) continue;
                var nameProp = f.GetType().GetProperty("Name", BindingFlags.Public | BindingFlags.Instance);
                var name = nameProp?.GetValue(f) as string;
                if (string.IsNullOrEmpty(name) || !string.Equals(name, "Type", StringComparison.OrdinalIgnoreCase))
                    continue;
                var getRaw = f.GetType().GetMethod("GetRawValue", [typeof(int)]);
                var raw = getRaw?.Invoke(f, [0]);
                if (raw is byte b) return b;
                if (raw is uint u) return (byte)u;
                if (raw is int i) return (byte)i;
                return null;
            }
        }
        catch
        {
            // ignore
        }
        return null;
    }

    private static Mesg? GetMesgFromEventArgs(MesgEventArgs e)
    {
        var field = typeof(MesgEventArgs).GetField("mesg",
            BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
        return field?.GetValue(e) as Mesg;
    }

    private static string GetWorkoutMesgString(WorkoutMesg? msg, Func<string?> getter, string defaultValue)
    {
        if (msg is null) return defaultValue;
        try
        {
            var value = getter();
            return string.IsNullOrEmpty(value) ? defaultValue : value;
        }
        catch (NullReferenceException)
        {
            return defaultValue;
        }
    }

    private static bool IsRepeatMarker(WorkoutStepMesg stepMsg)
    {
        var durationType = stepMsg.GetDurationType();
        var durationTimeF = stepMsg.GetDurationTime();
        return (durationType == WktStepDuration.RepeatUntilStepsCmplt || durationType == WktStepDuration.RepeatUntilTime)
            && !durationTimeF.HasValue && (stepMsg.GetRepeatTime() ?? 0) == 0;
    }

    /// <summary>
    /// Infers the FTP (watts) used when the FIT was exported, from the first step if it looks like a warmup (long ramp 25%→…).
    /// So we can convert watts to % and get 25–75% instead of wrong values when user FTP differs from export FTP.
    /// </summary>
    private static int? InferExportFtpFromFirstStep(List<WorkoutStepMesg> realSteps)
    {
        if (realSteps.Count == 0) return null;
        var first = realSteps[0];
        var durationTime = first.GetDurationTime();
        if (!durationTime.HasValue || durationTime.Value < 300) return null; // need at least 5 min
        var rawLow = GetRawPowerFromField(first, "CustomTargetValueLow") ?? GetRawPowerFromField(first, "custom_target_power_low");
        var rawHigh = GetRawPowerFromField(first, "CustomTargetValueHigh") ?? GetRawPowerFromField(first, "custom_target_power_high");
        if (!rawLow.HasValue || !rawHigh.HasValue || rawLow.Value >= rawHigh.Value) return null;
        // Assume warmup low = 25% FTP → exportFtp = (watts at low) / 0.25 = (rawLow/10) / 0.25
        var wattsLow = rawLow.Value / 10m;
        if (wattsLow < 20m || wattsLow > 400m) return null;
        var inferred = (int)Math.Round(wattsLow / 0.25m);
        return inferred is >= 100 and <= 600 ? inferred : null;
    }

    private static uint? GetRawPowerFromField(WorkoutStepMesg stepMsg, string fieldName)
    {
        try
        {
            var fieldsProp = typeof(Mesg).GetProperty("Fields", BindingFlags.Public | BindingFlags.Instance);
            var fields = fieldsProp?.GetValue(stepMsg) as System.Collections.IEnumerable;
            if (fields is null) return null;
            foreach (var f in fields)
            {
                if (f is null) continue;
                var nameProp = f.GetType().GetProperty("Name", BindingFlags.Public | BindingFlags.Instance);
                var name = nameProp?.GetValue(f) as string;
                if (string.IsNullOrEmpty(name) || !name.Contains(fieldName, StringComparison.OrdinalIgnoreCase))
                    continue;
                var getRaw = f.GetType().GetMethod("GetRawValue", [typeof(int)]);
                var raw = getRaw?.Invoke(f, [0]);
                if (raw is uint ru) return ru;
                if (raw is int ri) return (uint)ri;
                if (raw is long rl) return (uint)rl;
                return null;
            }
        }
        catch { /* ignore */ }
        return null;
    }

    private static List<WorkoutStep> MapWorkoutStep(WorkoutStepMesg stepMsg, Guid workoutId, ref int order, int? userFtpWatts = null,
        int? stepIndexAmongReal = null, int totalRealSteps = 0)
    {
        var steps = new List<WorkoutStep>();
        var durationType = stepMsg.GetDurationType();
        float? durationTimeF = stepMsg.GetDurationTime();

        if (IsRepeatMarker(stepMsg))
            return steps;

        var intensity = stepMsg.GetIntensity();
        var stepType = MapIntensityToStepType(intensity.HasValue ? (byte)(int)intensity.Value : (byte?)null);

        float? durationDistanceF = stepMsg.GetDurationDistance();
        float? repeatTimeF = stepMsg.GetRepeatTime();
        float? repeatStepsF = stepMsg.GetRepeatSteps();
        uint? durationValueU = stepMsg.GetDurationValue();
        uint? repeatPowerU = stepMsg.GetRepeatPower();

        decimal powerLow = 0.65m;
        decimal powerHigh = 0.65m;
        var targetType = stepMsg.GetTargetType();
        // PowerLap (10) is used by Zwift for power targets; SDK getters may return null, we read from Fields
        if (targetType == WktStepTarget.Power || targetType == WktStepTarget.Power3s
            || targetType == WktStepTarget.Power10s || targetType == WktStepTarget.Power30s
            || targetType == WktStepTarget.PowerLap)
        {
            var fromFieldLow = GetPowerFractionFromField(stepMsg, "CustomTargetValueLow", userFtpWatts)
                ?? GetPowerFractionFromField(stepMsg, "custom_target_power_low", userFtpWatts);
            var fromFieldHigh = GetPowerFractionFromField(stepMsg, "CustomTargetValueHigh", userFtpWatts)
                ?? GetPowerFractionFromField(stepMsg, "custom_target_power_high", userFtpWatts);
            if (fromFieldLow.HasValue) powerLow = fromFieldLow.Value;
            if (fromFieldHigh.HasValue) powerHigh = fromFieldHigh.Value;
            var low = stepMsg.GetCustomTargetPowerLow();
            var high = stepMsg.GetCustomTargetPowerHigh();
            // Treat 0 as unset (e.g. Zwift leaves custom power 0 and puts percent in target_value)
            var lowSet = low.HasValue && low.Value > 0;
            var highSet = high.HasValue && high.Value > 0;
            if (!fromFieldLow.HasValue && lowSet) powerLow = PowerValueToFraction(low!.Value);
            if (!fromFieldHigh.HasValue && highSet) powerHigh = PowerValueToFraction(high!.Value);
            if (!fromFieldLow.HasValue && !fromFieldHigh.HasValue && !lowSet && !highSet && stepMsg.GetTargetValue() is { } tv)
                powerLow = powerHigh = tv >= 1 && tv <= 7 ? PowerZoneToFraction(tv) : PowerValueToFraction(tv);
            if (lowSet && !highSet) powerHigh = powerLow;
            if (highSet && !lowSet) powerLow = powerHigh;
            // Steady target: when low and high are within ~8%, use single value rounded to 1% so UI shows "50%" not "50–53%"
            if (Math.Abs(powerHigh - powerLow) <= 0.08m)
                powerLow = powerHigh = Math.Round((powerLow + powerHigh) / 2m, 2);
        }
        else if (stepMsg.GetTargetPowerZone() is { } zone && zone >= 1 && zone <= 7)
        {
            powerLow = powerHigh = PowerZoneToFraction(zone);
        }
        else if (stepMsg.GetTargetValue() is { } targetVal)
        {
            if (targetVal >= 1 && targetVal <= 7)
                powerLow = powerHigh = PowerZoneToFraction(targetVal);
            else
                powerLow = powerHigh = PowerValueToFraction(targetVal);
        }

        int durationSeconds;
        int? onDuration = null;
        int? offDuration = null;
        int? repeat = null;
        decimal? onPower = null;
        decimal? offPower = null;

        switch (durationType)
        {
            case WktStepDuration.Time:
                durationSeconds = (int)(durationTimeF ?? durationValueU ?? 0);
                break;
            case WktStepDuration.RepetitionTime:
                var onTime = (int)(durationTimeF ?? 0);
                var offTime = (int)(repeatTimeF ?? 0);
                var reps = (int)(durationValueU ?? repeatStepsF ?? 1);
                if (reps < 1) reps = 1;
                durationSeconds = reps * (onTime + offTime);
                onDuration = onTime;
                offDuration = offTime;
                repeat = reps;
                onPower = powerHigh;
                offPower = (repeatPowerU.HasValue && repeatPowerU.Value > 0) ? PowerValueToFraction(repeatPowerU.Value) : 0.5m;
                stepType = StepType.Intervals;
                break;
            case WktStepDuration.RepeatUntilTime:
            case WktStepDuration.RepeatUntilStepsCmplt:
                durationSeconds = (int)(durationTimeF ?? durationValueU ?? 0);
                if (repeatTimeF.HasValue && repeatTimeF.Value > 0)
                {
                    onDuration = (int)(durationTimeF ?? 0);
                    offDuration = (int)repeatTimeF.Value;
                    repeat = (int)(durationValueU ?? 1);
                    onPower = powerHigh;
                    offPower = (repeatPowerU.HasValue && repeatPowerU.Value > 0) ? PowerValueToFraction(repeatPowerU.Value) : 0.5m;
                    stepType = StepType.Intervals;
                }
                break;
            default:
                durationSeconds = (int)(durationTimeF ?? durationValueU ?? durationDistanceF ?? 0);
                if (durationSeconds <= 0) durationSeconds = 60;
                break;
        }

        if (durationSeconds <= 0 && (onDuration ?? 0) + (offDuration ?? 0) > 0)
            durationSeconds = (repeat ?? 1) * ((onDuration ?? 0) + (offDuration ?? 0));

        // Zwift often writes Intensity=Interval for all steps. Override from position and power pattern.
        if (stepIndexAmongReal.HasValue && totalRealSteps > 0 && durationType == WktStepDuration.Time
            && !repeat.HasValue)
        {
            var idx = stepIndexAmongReal.Value;
            if (idx == 0 && durationSeconds >= 300 && powerLow < powerHigh && powerHigh <= 0.95m)
                stepType = StepType.Warmup;
            else if (idx == totalRealSteps - 1 && durationSeconds >= 120 && powerLow < powerHigh && powerHigh <= 0.95m)
            {
                stepType = StepType.Cooldown;
                // Cooldown ramps from high to low (90%→25%). UI draws ramp powerLow→powerHigh, so swap to get 90→25.
                (powerLow, powerHigh) = (powerHigh, powerLow);
            }
            else if (idx > 0 && idx < totalRealSteps - 1 && durationSeconds >= 120 && powerLow == powerHigh)
                stepType = StepType.SteadyState;
        }

        order++;
        var offPowerVal = offPower ?? 0.5m;
        var onPowerVal = onPower ?? 0.75m;
        var step = stepType == StepType.Intervals && repeat.HasValue && onDuration.HasValue && offDuration.HasValue
            ? WorkoutStep.Create(
                workoutId, order, stepType,
                durationSeconds, offPowerVal, onPowerVal, null,
                repeat, onDuration, offDuration, onPowerVal, offPowerVal)
            : WorkoutStep.Create(
                workoutId, order, stepType,
                durationSeconds, powerLow, powerHigh, null);

        steps.Add(step);
        return steps;
    }

    private static StepType MapIntensityToStepType(byte? intensity)
    {
        if (!intensity.HasValue) return StepType.SteadyState;
        return (Intensity)intensity.Value switch
        {
            Intensity.Warmup => StepType.Warmup,
            Intensity.Cooldown => StepType.Cooldown,
            Intensity.Rest => StepType.SteadyState,
            Intensity.Recovery => StepType.SteadyState,
            Intensity.Interval => StepType.Intervals,
            Intensity.Active => StepType.SteadyState,
            _ => StepType.SteadyState
        };
    }

    private static WorkoutCategory ClassifyWorkout(Workout workout)
    {
        if (workout.Steps.Count == 0) return WorkoutCategory.Mixed;

        var zoneTimes = new Dictionary<TrainingZone, int>();
        foreach (var step in workout.Steps)
        {
            var zone = PowerToZone(step.GetWeightedPower());
            var dur = step.GetTotalDurationSeconds();
            zoneTimes.TryAdd(zone, 0);
            zoneTimes[zone] += dur;
        }

        var dominantZone = zoneTimes.OrderByDescending(kv => kv.Value).First().Key;

        return dominantZone switch
        {
            TrainingZone.Z1 => WorkoutCategory.Recovery,
            TrainingZone.Z2 => WorkoutCategory.Endurance,
            TrainingZone.Z3 when HasSignificantSweetSpot(workout) => WorkoutCategory.SweetSpot,
            TrainingZone.Z3 => WorkoutCategory.Tempo,
            TrainingZone.Z4 => WorkoutCategory.Threshold,
            TrainingZone.Z5 => WorkoutCategory.VO2Max,
            TrainingZone.Z6 => WorkoutCategory.Anaerobic,
            _ => WorkoutCategory.Mixed
        };
    }

    private static TrainingZone DetermineTargetZone(Workout workout)
    {
        if (workout.Steps.Count == 0) return TrainingZone.Z2;

        var mainSteps = workout.Steps
            .Where(s => s.Type != StepType.Warmup && s.Type != StepType.Cooldown)
            .ToList();

        if (mainSteps.Count == 0) return TrainingZone.Z2;

        var maxPower = mainSteps.Max(s => s.GetWeightedPower());
        return PowerToZone(maxPower);
    }

    private static bool HasSignificantSweetSpot(Workout workout)
    {
        var totalDuration = workout.Steps.Sum(s => s.GetTotalDurationSeconds());
        if (totalDuration == 0) return false;

        var sweetSpotDuration = workout.Steps
            .Where(s => s.GetWeightedPower() >= 0.84m && s.GetWeightedPower() <= 0.97m)
            .Sum(s => s.GetTotalDurationSeconds());

        return (decimal)sweetSpotDuration / totalDuration > 0.3m;
    }

    private static TrainingZone PowerToZone(decimal ftpPercent) => ftpPercent switch
    {
        < 0.56m => TrainingZone.Z1,
        < 0.76m => TrainingZone.Z2,
        < 0.91m => TrainingZone.Z3,
        < 1.06m => TrainingZone.Z4,
        < 1.21m => TrainingZone.Z5,
        _ => TrainingZone.Z6
    };
}
