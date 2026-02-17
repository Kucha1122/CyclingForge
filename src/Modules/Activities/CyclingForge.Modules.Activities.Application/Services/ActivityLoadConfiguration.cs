namespace CyclingForge.Modules.Activities.Application.Services;

/// <summary>
/// Configuration options for activity load calculation.
/// Defines sport-specific multipliers for different activity types.
/// </summary>
public sealed class ActivityLoadConfiguration
{
    /// <summary>
    /// Sport-specific factors for calculating training load.
    /// Key is the activity type (e.g., "Walk", "Ride", "Run").
    /// </summary>
    public Dictionary<string, SportFactorSettings> SportFactors { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        // Default values calibrated to match Intervals.icu behavior
        // User reported: Walk Load=10 vs calculated TSS=30, giving factor = 0.333
        ["Walk"] = new SportFactorSettings { TssMultiplier = 0.33f, UseHrss = true, Description = "Walking/Hiking" },
        ["Hike"] = new SportFactorSettings { TssMultiplier = 0.30f, UseHrss = true, Description = "Hiking" },
        ["Ride"] = new SportFactorSettings { TssMultiplier = 0.72f, UseHrss = true, Description = "Cycling without power" },
        ["VirtualRide"] = new SportFactorSettings { TssMultiplier = 0.72f, UseHrss = true, Description = "Indoor cycling without power" },
        ["Run"] = new SportFactorSettings { TssMultiplier = 0.90f, UseHrss = true, Description = "Running" },
        ["Swim"] = new SportFactorSettings { TssMultiplier = 0.75f, UseHrss = true, Description = "Swimming" },
        ["AlpineSki"] = new SportFactorSettings { TssMultiplier = 0.50f, UseHrss = true, Description = "Alpine skiing" },
        ["BackcountrySki"] = new SportFactorSettings { TssMultiplier = 0.85f, UseHrss = true, Description = "Backcountry skiing" },
        ["NordicSki"] = new SportFactorSettings { TssMultiplier = 0.90f, UseHrss = true, Description = "Nordic skiing" },
        ["Workout"] = new SportFactorSettings { TssMultiplier = 0.70f, UseHrss = true, Description = "General workout" },
        ["Yoga"] = new SportFactorSettings { TssMultiplier = 0.25f, UseHrss = true, Description = "Yoga/stretching" }
    };

    /// <summary>
    /// Gets the sport factor for a specific activity type.
    /// Returns default settings if activity type not found.
    /// </summary>
    public SportFactorSettings GetSportFactor(string activityType)
    {
        if (string.IsNullOrWhiteSpace(activityType))
        {
            return SportFactorSettings.Default;
        }

        return SportFactors.TryGetValue(activityType, out var settings) 
            ? settings 
            : SportFactorSettings.Default;
    }
}

/// <summary>
/// Settings for a specific sport/activity type.
/// </summary>
public sealed class SportFactorSettings
{
    /// <summary>
    /// Multiplier applied to calculated TSS/HRSS.
    /// Example: 0.33 for walking means load is 33% of calculated HRSS.
    /// </summary>
    public float TssMultiplier { get; set; } = 1.0f;

    /// <summary>
    /// Whether to use HRSS (exponential TRIMP) instead of simple HR-based TSS.
    /// </summary>
    public bool UseHrss { get; set; } = true;

    /// <summary>
    /// Human-readable description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Default settings for unknown activity types.
    /// </summary>
    public static SportFactorSettings Default => new()
    {
        TssMultiplier = 1.0f,
        UseHrss = true,
        Description = "Default (no adjustment)"
    };
}
