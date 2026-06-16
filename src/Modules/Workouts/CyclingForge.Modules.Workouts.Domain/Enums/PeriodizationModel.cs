namespace CyclingForge.Modules.Workouts.Domain.Enums;

public enum PeriodizationModel
{
    /// <summary>Engine picks the model automatically based on goal and fitness level.</summary>
    Auto,

    /// <summary>~80/20 distribution: mostly low intensity with a few hard sessions.</summary>
    Polarized,

    /// <summary>Large endurance base, moderate tempo/sweet-spot, little high intensity.</summary>
    Pyramidal
}
