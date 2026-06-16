namespace CyclingForge.Shared.Abstractions.Time;

/// <summary>
/// Helpers for resolving the start of a week given a user-configurable first weekday.
/// Weekday indices follow the application convention: 0 = Monday .. 6 = Sunday.
/// </summary>
public static class WeekDates
{
    /// <summary>Returns the start of the week containing <paramref name="date"/> for the given first weekday (0 = Monday .. 6 = Sunday).</summary>
    public static DateOnly GetWeekStart(DateOnly date, int weekStartDay)
    {
        var dayIndex = ((int)date.DayOfWeek + 6) % 7; // Monday = 0 .. Sunday = 6
        var diff = (dayIndex - weekStartDay + 7) % 7;
        return date.AddDays(-diff);
    }

    /// <summary>Returns the start of the week containing <paramref name="date"/> (date-only, time stripped).</summary>
    public static DateTime GetWeekStart(DateTime date, int weekStartDay)
    {
        var dayIndex = ((int)date.DayOfWeek + 6) % 7;
        var diff = (dayIndex - weekStartDay + 7) % 7;
        return date.AddDays(-diff).Date;
    }
}
