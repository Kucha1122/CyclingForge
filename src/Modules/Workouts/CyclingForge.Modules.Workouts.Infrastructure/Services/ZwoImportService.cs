using System.Xml.Linq;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;

namespace CyclingForge.Modules.Workouts.Infrastructure.Services;

internal sealed class ZwoImportService : IZwoImportService
{
    public Workout ParseZwo(string xmlContent, Guid? userId, DateTime createdAt)
    {
        var doc = XDocument.Parse(xmlContent);
        var root = doc.Root ?? throw new InvalidOperationException("Invalid ZWO file.");

        var name = root.Element("name")?.Value ?? "Imported Workout";
        var description = root.Element("description")?.Value ?? string.Empty;

        var workoutElement = root.Element("workout")
            ?? throw new InvalidOperationException("No workout element found.");

        var workout = Workout.Create(
            userId,
            name,
            description,
            WorkoutCategory.Mixed,
            userId.HasValue ? WorkoutSource.Imported : WorkoutSource.System,
            TrainingZone.Z3,
            false,
            ExtractTags(root),
            createdAt);

        var order = 0;
        foreach (var element in workoutElement.Elements())
        {
            var steps = ParseElement(element, workout.Id, ref order);
            foreach (var step in steps)
                workout.AddStep(step);
        }

        var category = ClassifyWorkout(workout);
        var targetZone = DetermineTargetZone(workout);

        workout.Update(name, description, category, targetZone, workout.IsPublic, workout.Tags, createdAt);

        return workout;
    }

    public string ExportToZwo(Workout workout)
    {
        var doc = new XDocument(
            new XElement("workout_file",
                new XElement("name", workout.Name),
                new XElement("author", "CyclingForge"),
                new XElement("description", workout.Description),
                new XElement("sportType", "bike"),
                new XElement("workout",
                    workout.Steps.OrderBy(s => s.Order).Select(StepToXElement)
                )
            )
        );

        return doc.ToString();
    }

    private static List<WorkoutStep> ParseElement(XElement element, Guid workoutId, ref int order)
    {
        var steps = new List<WorkoutStep>();
        var tagName = element.Name.LocalName;

        switch (tagName)
        {
            case "Warmup":
                steps.Add(CreateRampStep(element, workoutId, ref order, StepType.Warmup));
                break;

            case "Cooldown":
                steps.Add(CreateRampStep(element, workoutId, ref order, StepType.Cooldown));
                break;

            case "SteadyState":
                steps.Add(CreateSteadyStateStep(element, workoutId, ref order));
                break;

            case "Ramp":
                steps.Add(CreateRampStep(element, workoutId, ref order, StepType.Ramp));
                break;

            case "IntervalsT":
                steps.Add(CreateIntervalsStep(element, workoutId, ref order));
                break;

            case "FreeRide":
                steps.Add(CreateFreeRideStep(element, workoutId, ref order));
                break;
        }

        return steps;
    }

    private static WorkoutStep CreateSteadyStateStep(XElement el, Guid workoutId, ref int order)
    {
        var duration = GetIntAttr(el, "Duration");
        var power = GetDecimalAttr(el, "Power", 0.5m);
        var cadence = GetNullableIntAttr(el, "Cadence");

        return WorkoutStep.Create(
            workoutId, ++order, StepType.SteadyState,
            duration, power, power, cadence);
    }

    private static WorkoutStep CreateRampStep(XElement el, Guid workoutId, ref int order, StepType type)
    {
        var duration = GetIntAttr(el, "Duration");
        var powerLow = GetDecimalAttr(el, "PowerLow", 0.25m);
        var powerHigh = GetDecimalAttr(el, "PowerHigh", 0.75m);
        var cadence = GetNullableIntAttr(el, "Cadence");

        return WorkoutStep.Create(
            workoutId, ++order, type,
            duration, powerLow, powerHigh, cadence);
    }

    private static WorkoutStep CreateIntervalsStep(XElement el, Guid workoutId, ref int order)
    {
        var repeat = GetIntAttr(el, "Repeat", 1);
        var onDuration = GetIntAttr(el, "OnDuration");
        var offDuration = GetIntAttr(el, "OffDuration");
        var onPower = GetDecimalAttr(el, "OnPower", 1.0m);
        var offPower = GetDecimalAttr(el, "OffPower", 0.5m);
        var cadence = GetNullableIntAttr(el, "Cadence");
        var onCadence = GetNullableIntAttr(el, "OnCadence") ?? cadence;
        var offCadence = GetNullableIntAttr(el, "OffCadence");

        var totalDuration = repeat * (onDuration + offDuration);

        return WorkoutStep.Create(
            workoutId, ++order, StepType.Intervals,
            totalDuration, offPower, onPower, cadence,
            repeat, onDuration, offDuration, onPower, offPower,
            onCadence, offCadence);
    }

    private static WorkoutStep CreateFreeRideStep(XElement el, Guid workoutId, ref int order)
    {
        var duration = GetIntAttr(el, "Duration");
        var cadence = GetNullableIntAttr(el, "Cadence");

        return WorkoutStep.Create(
            workoutId, ++order, StepType.FreeRide,
            duration, 0, 0, cadence);
    }

    private static XElement BuildIntervalsXElement(WorkoutStep step)
    {
        var attrs = new List<XAttribute>
        {
            new("Repeat", step.Repeat ?? 1),
            new("OnDuration", step.OnDurationSeconds ?? 0),
            new("OffDuration", step.OffDurationSeconds ?? 0),
            new("OnPower", step.OnPower ?? 1.0m),
            new("OffPower", step.OffPower ?? 0.5m)
        };
        if (step.OnCadence.HasValue)
            attrs.Add(new XAttribute("OnCadence", step.OnCadence.Value));
        if (step.OffCadence.HasValue)
            attrs.Add(new XAttribute("OffCadence", step.OffCadence.Value));
        return new XElement("IntervalsT", attrs);
    }

    private static XElement StepToXElement(WorkoutStep step)
    {
        return step.Type switch
        {
            StepType.Warmup => BuildRampLikeXElement("Warmup", step),
            StepType.Cooldown => BuildRampLikeXElement("Cooldown", step),
            StepType.SteadyState => step.PowerLow != step.PowerHigh
                ? BuildRampLikeXElement("Ramp", step)
                : BuildSteadyStateXElement(step),
            StepType.Ramp => BuildRampLikeXElement("Ramp", step),
            StepType.Intervals => BuildIntervalsXElement(step),
            StepType.FreeRide => BuildFreeRideXElement(step),
            _ => new XElement("SteadyState",
                new XAttribute("Duration", step.DurationSeconds),
                new XAttribute("Power", step.PowerHigh))
        };
    }

    private static XElement BuildRampLikeXElement(string tagName, WorkoutStep step)
    {
        var attrs = new List<XAttribute>
        {
            new("Duration", step.DurationSeconds),
            new("PowerLow", step.PowerLow),
            new("PowerHigh", step.PowerHigh)
        };
        if (step.Cadence.HasValue)
            attrs.Add(new XAttribute("Cadence", step.Cadence.Value));
        return new XElement(tagName, attrs);
    }

    private static XElement BuildSteadyStateXElement(WorkoutStep step)
    {
        var attrs = new List<XAttribute>
        {
            new("Duration", step.DurationSeconds),
            new("Power", step.PowerHigh)
        };
        if (step.Cadence.HasValue)
            attrs.Add(new XAttribute("Cadence", step.Cadence.Value));
        return new XElement("SteadyState", attrs);
    }

    private static XElement BuildFreeRideXElement(WorkoutStep step)
    {
        var attrs = new List<XAttribute> { new("Duration", step.DurationSeconds) };
        if (step.Cadence.HasValue)
            attrs.Add(new XAttribute("Cadence", step.Cadence.Value));
        return new XElement("FreeRide", attrs);
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

    private static string? ExtractTags(XElement root)
    {
        var tags = root.Element("tags");
        if (tags is null) return null;

        var tagList = tags.Elements("tag")
            .Select(t => t.Attribute("name")?.Value)
            .Where(t => !string.IsNullOrEmpty(t));

        var result = string.Join(",", tagList);
        return string.IsNullOrEmpty(result) ? null : result;
    }

    private static int GetIntAttr(XElement el, string name, int defaultValue = 0)
    {
        var attr = el.Attribute(name);
        return attr is not null && int.TryParse(attr.Value, out var val) ? val : defaultValue;
    }

    private static decimal GetDecimalAttr(XElement el, string name, decimal defaultValue = 0)
    {
        var attr = el.Attribute(name);
        return attr is not null && decimal.TryParse(attr.Value, System.Globalization.CultureInfo.InvariantCulture, out var val)
            ? val : defaultValue;
    }

    private static int? GetNullableIntAttr(XElement el, string name)
    {
        var attr = el.Attribute(name);
        if (attr is not null && int.TryParse(attr.Value, out var val))
            return val;
        // Some ZWO files use lowercase (e.g. "cadence" instead of "Cadence")
        if (name.Length > 0 && char.IsUpper(name[0]))
        {
            var lowerName = char.ToLowerInvariant(name[0]) + name[1..];
            attr = el.Attribute(lowerName);
            if (attr is not null && int.TryParse(attr.Value, out var valLower))
                return valLower;
        }
        return null;
    }
}
