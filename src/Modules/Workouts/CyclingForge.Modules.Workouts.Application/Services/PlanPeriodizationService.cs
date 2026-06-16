using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Shared.Abstractions.Time;

namespace CyclingForge.Modules.Workouts.Application.Services;

public sealed class PlanPeriodizationService : IPlanPeriodizationService
{
    private const int TaperWindowDays = 10;

    public DayIntent GetDayIntent(TrainingPreference preference, DateOnly planStart, DateOnly date)
    {
        var model = ResolveModel(preference);
        var macroWeekIndex = Math.Max(0, (date.DayNumber - planStart.DayNumber) / 7);
        var dayOfWeek = ((int)date.DayOfWeek + 6) % 7; // Monday = 0 ... Sunday = 6

        // Week slots are built relative to the user's first day of the week, so slot 0 is always the
        // configured first day (and a training day for auto-placed schedules). Rest days and the
        // long-ride day are still concrete weekdays (Mon=0) and get converted into this relative space.
        var weekStartDay = preference.WeekStartDay;
        var relDay = (dayOfWeek - weekStartDay + 7) % 7;

        // User-configurable meso-cycle: (cycleLength - 1) progressive build weeks + 1 deload week.
        var cycleLength = Math.Clamp(preference.MesocycleWeeks, 2, 8);
        var weekInCycle = macroWeekIndex % cycleLength;
        var isDeload = weekInCycle == cycleLength - 1;

        var isTaper = false;
        if (preference.TargetEventDate is { } eventDate)
        {
            var daysToEvent = DateOnly.FromDateTime(eventDate).DayNumber - date.DayNumber;
            isTaper = daysToEvent is >= 0 and <= TaperWindowDays;
        }

        var weekCategories = BuildWeekCategories(preference, model, isDeload, isTaper, weekStartDay);
        var longRideDay = ResolveLongRideDay(preference, weekCategories, weekStartDay);
        var category = weekCategories[relDay];

        // Long-term progression: each completed meso-cycle lifts the baseline volume a little,
        // so the plan keeps progressing instead of repeating identical cycles.
        var completedCycles = macroWeekIndex / cycleLength;
        var progression = Math.Min(1.25m, 1m + 0.04m * completedCycles);
        var weekVolumeFactor = ComputeWeekVolumeFactor(weekInCycle, cycleLength, isDeload, isTaper) * progression;

        if (category is null)
        {
            return new DayIntent(true, WorkoutCategory.Recovery, 0m, 0, isDeload, isTaper, model);
        }

        var loadFactor = Math.Round(weekVolumeFactor * CategoryIntensityFactor(category.Value), 3);
        var targetDuration = ComputeTargetDurationMinutes(
            preference, weekCategories, relDay, longRideDay, weekVolumeFactor);

        return new DayIntent(false, category.Value, loadFactor, targetDuration, isDeload, isTaper, model);
    }

    // The configured long-ride day is honoured only when it actually falls on an endurance
    // training day; otherwise the weekly endurance volume is spread normally.
    // Returns the long-ride day as a relative index (0 = first day of week), or null.
    private static int? ResolveLongRideDay(TrainingPreference preference, WorkoutCategory?[] weekCategories, int weekStartDay)
    {
        if (preference.LongRideDay is not { } day || day is < 0 or > 6)
            return null;

        var rel = (day - weekStartDay + 7) % 7;
        return weekCategories[rel] == WorkoutCategory.Endurance ? rel : null;
    }

    // Distributes the weekly hour budget across the week's training days, weighted by the role of
    // each day's category (long endurance days take the largest share). The weekly hours drive
    // total volume; the preferred session length is only a fallback when no budget is set.
    private static int ComputeTargetDurationMinutes(
        TrainingPreference preference,
        WorkoutCategory?[] weekCategories,
        int dayOfWeek,
        int? longRideDay,
        decimal weekVolumeFactor)
    {
        var budgetMinutes = preference.WeeklyHoursAvailable * 60m * weekVolumeFactor;
        var dayCategory = weekCategories[dayOfWeek];

        if (budgetMinutes <= 0m || dayCategory is null)
        {
            var fallback = preference.PreferredWorkoutMinutes > 0 ? preference.PreferredWorkoutMinutes : 60;
            return Math.Clamp(fallback, 30, 240);
        }

        // Concentrate endurance volume into one long ride (capped by how long the user can ride),
        // then distribute the remaining budget across the other training days.
        if (longRideDay is { } lr)
        {
            var maxLong = Math.Clamp((decimal)preference.MaxLongRideMinutes * weekVolumeFactor, 60m, 360m);
            var longRideMin = Math.Min(maxLong, budgetMinutes * 0.70m);

            if (dayOfWeek == lr)
                return Round5Clamp(longRideMin, 60, 360);

            var otherWeight = weekCategories
                .Where((c, i) => c.HasValue && i != lr)
                .Sum(c => DurationWeight(c!.Value));
            var remaining = budgetMinutes - longRideMin;
            if (otherWeight <= 0m || remaining <= 0m)
                return Round5Clamp(budgetMinutes * DurationWeight(dayCategory.Value) / TotalWeight(weekCategories), 30, 240);

            return Round5Clamp(remaining * DurationWeight(dayCategory.Value) / otherWeight, 30, 240);
        }

        return Round5Clamp(budgetMinutes * DurationWeight(dayCategory.Value) / TotalWeight(weekCategories), 30, 240);
    }

    private static decimal TotalWeight(WorkoutCategory?[] weekCategories)
    {
        var total = weekCategories.Where(c => c.HasValue).Sum(c => DurationWeight(c!.Value));
        return total <= 0m ? 1m : total;
    }

    private static int Round5Clamp(decimal minutes, int min, int max)
    {
        var rounded = (int)(Math.Round(minutes / 5m) * 5m);
        return Math.Clamp(rounded, min, max);
    }

    // Relative share of weekly volume per category role (independent of intensity scoring).
    // Quality days are given enough time for a meaningful Z2 lead-in before the intervals
    // (durability), not just the hard set itself.
    private static decimal DurationWeight(WorkoutCategory category) => category switch
    {
        WorkoutCategory.Recovery => 0.50m,
        WorkoutCategory.Endurance => 1.50m,
        WorkoutCategory.Tempo => 1.10m,
        WorkoutCategory.SweetSpot => 1.10m,
        WorkoutCategory.Threshold => 1.05m,
        WorkoutCategory.VO2Max => 0.95m,
        WorkoutCategory.Anaerobic => 0.80m,
        WorkoutCategory.Sprint => 0.80m,
        WorkoutCategory.Mixed => 1.00m,
        _ => 1.00m
    };

    public DayIntent? GetActivePlanIntent(TrainingPreference preference, DateOnly date)
    {
        if (preference.PlanMode != PlanMode.FullPlan)
            return null;

        var anchor = WeekDates.GetWeekStart(
            DateOnly.FromDateTime(preference.UpdatedAt ?? preference.CreatedAt), preference.WeekStartDay);
        return GetDayIntent(preference, anchor, date);
    }

    // Volume ramps from ~0.85 on the first build week up to 1.0 on the last build week
    // (progressive overload); deload and taper weeks drop the volume to recover.
    private static decimal ComputeWeekVolumeFactor(int weekInCycle, int cycleLength, bool isDeload, bool isTaper)
    {
        if (isTaper)
            return 0.50m;
        if (isDeload)
            return 0.55m;

        var buildWeeks = cycleLength - 1;
        if (buildWeeks <= 1)
            return 1.00m;

        return 0.85m + 0.15m * weekInCycle / (buildWeeks - 1);
    }

    private static PeriodizationModel ResolveModel(TrainingPreference preference)
    {
        if (preference.PeriodizationModel != PeriodizationModel.Auto)
            return preference.PeriodizationModel;

        if (preference.Level == FitnessLevel.Beginner)
            return PeriodizationModel.Pyramidal;

        return preference.Goal switch
        {
            TrainingGoal.FtpImprovement => PeriodizationModel.Polarized,
            TrainingGoal.RacePrep => PeriodizationModel.Polarized,
            TrainingGoal.SprintPower => PeriodizationModel.Polarized,
            _ => PeriodizationModel.Pyramidal
        };
    }

    // Returns a 7-slot week indexed relative to the first day of the week (slot 0 = WeekStartDay);
    // null = rest / active-recovery day.
    private static WorkoutCategory?[] BuildWeekCategories(
        TrainingPreference preference, PeriodizationModel model, bool isDeload, bool isTaper, int weekStartDay)
    {
        var week = new WorkoutCategory?[7];

        // Rest days are concrete weekdays (Mon=0); convert them to relative slots so a chosen
        // weekday stays fixed regardless of which day the week starts on.
        var restDays = preference.GetRestDays().Select(d => (d - weekStartDay + 7) % 7).ToList();
        var trainingDays = restDays.Count > 0
            ? Enumerable.Range(0, 7).Where(d => !restDays.Contains(d)).ToList()
            : (IReadOnlyList<int>)TrainingWeekdays(preference.DaysPerWeek);

        var dayCount = trainingDays.Count;

        // The long-ride day is reserved for endurance, so keep it out of the hard-day rotation.
        var relLongRide = preference.LongRideDay is { } lrAbs && lrAbs is >= 0 and <= 6
            ? (lrAbs - weekStartDay + 7) % 7
            : (int?)null;
        var reservedLongRide = relLongRide is { } lr && trainingDays.Contains(lr) ? lr : (int?)null;
        var hardCandidates = reservedLongRide is { } r
            ? trainingDays.Where(d => d != r).ToList()
            : trainingDays;

        var hardCount = isDeload ? (dayCount >= 5 ? 1 : 0)
            : isTaper ? 1
            : dayCount >= 6 ? 3
            : dayCount <= 3 ? 1 : 2;

        var hardDays = PickSpacedDays(hardCandidates, hardCount);

        var hardSlot = 0;
        foreach (var day in trainingDays)
        {
            WorkoutCategory category;

            if (day == reservedLongRide)
            {
                category = WorkoutCategory.Endurance;
            }
            else if (hardDays.Contains(day))
            {
                category = HardCategory(model, preference.Goal, hardSlot, isDeload, isTaper);
                hardSlot++;
            }
            else
            {
                category = EasyCategory(isDeload);
            }

            week[day] = CapForLevel(category, preference.Level);
        }

        return week;
    }

    private static WorkoutCategory HardCategory(
        PeriodizationModel model, TrainingGoal goal, int hardSlot, bool isDeload, bool isTaper)
    {
        if (isDeload)
            return WorkoutCategory.Tempo;

        if (goal == TrainingGoal.SprintPower && hardSlot == 0)
            return isTaper ? WorkoutCategory.VO2Max : WorkoutCategory.Anaerobic;

        return model == PeriodizationModel.Polarized
            ? (hardSlot % 2 == 0 ? WorkoutCategory.VO2Max : WorkoutCategory.Threshold)
            : (hardSlot % 2 == 0 ? WorkoutCategory.SweetSpot : WorkoutCategory.Threshold);
    }

    private static WorkoutCategory EasyCategory(bool isDeload)
    {
        if (isDeload)
            return WorkoutCategory.Recovery;

        // Both models build their base on aerobic endurance; the polarized vs pyramidal
        // difference is expressed through the hard-day categories.
        return WorkoutCategory.Endurance;
    }

    // Beginners avoid the most demanding categories.
    private static WorkoutCategory CapForLevel(WorkoutCategory category, FitnessLevel level)
    {
        if (level != FitnessLevel.Beginner)
            return category;

        return category switch
        {
            WorkoutCategory.VO2Max or WorkoutCategory.Anaerobic or WorkoutCategory.Sprint => WorkoutCategory.SweetSpot,
            WorkoutCategory.Threshold => WorkoutCategory.SweetSpot,
            _ => category
        };
    }

    private static decimal CategoryIntensityFactor(WorkoutCategory category) => category switch
    {
        WorkoutCategory.Recovery => 0.50m,
        WorkoutCategory.Endurance => 0.85m,
        WorkoutCategory.Tempo => 1.00m,
        WorkoutCategory.SweetSpot => 1.10m,
        WorkoutCategory.Threshold => 1.20m,
        WorkoutCategory.VO2Max => 1.10m,
        WorkoutCategory.Anaerobic => 0.95m,
        WorkoutCategory.Sprint => 0.90m,
        WorkoutCategory.Mixed => 1.00m,
        _ => 1.00m
    };

    // Training-day distribution per frequency, expressed in slots RELATIVE to the first day of the
    // week (slot 0 = first day). Slot 0 is always a training day, so the plan starts training on the
    // user's chosen first day, with sessions spread across the rest of the week.
    private static IReadOnlyList<int> TrainingWeekdays(int daysPerWeek) => daysPerWeek switch
    {
        <= 2 => new[] { 0, 3 },                  // day 1, day 4
        3 => new[] { 0, 2, 4 },                  // day 1, 3, 5
        4 => new[] { 0, 2, 4, 5 },               // day 1, 3, 5, 6
        5 => new[] { 0, 2, 3, 5, 6 },            // day 1, 3, 4, 6, 7
        6 => new[] { 0, 1, 2, 4, 5, 6 },         // rest on day 4
        _ => new[] { 0, 1, 2, 3, 4, 5, 6 }       // every day
    };

    // Picks hard days that are always separated by at least one easy/rest day (>= 2 weekdays apart),
    // so demanding sessions (VO2Max, threshold, etc.) never land back-to-back. If the requested
    // count cannot be placed with that spacing, fewer hard days are scheduled (more recovery).
    private static HashSet<int> PickSpacedDays(IReadOnlyList<int> trainingDays, int count)
    {
        var result = new HashSet<int>();
        if (count <= 0 || trainingDays.Count == 0)
            return result;

        // Sentinel below any real weekday (0-6) so the first day is always eligible without
        // risking integer overflow on the spacing comparison.
        var lastPicked = -2;
        foreach (var day in trainingDays)
        {
            if (result.Count >= count)
                break;
            if (day - lastPicked >= 2)
            {
                result.Add(day);
                lastPicked = day;
            }
        }

        return result;
    }
}
