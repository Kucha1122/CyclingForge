using System;

namespace CyclingForge.Bootstrapper.Composition;

/// <summary>
/// Configuration options controlling how automatic eFTP changes are accepted.
/// Defaults are tuned to be more sensitive (min +3 W increases by default) while still avoiding noise.
/// </summary>
internal sealed class FtpEstimationOptions
{
    /// <summary>
    /// Minimal absolute increase in watts required to accept an automatic eFTP increase.
    /// </summary>
    public int MinIncreaseWatts { get; set; } = 3;

    /// <summary>
    /// Minimal relative increase (fraction, e.g. 0.02 = 2%) required to accept an automatic eFTP increase.
    /// If zero or negative, only the absolute threshold is considered.
    /// </summary>
    public double MinIncreasePercent { get; set; } = 0.02;

    /// <summary>
    /// Whether automatic eFTP-based decreases are allowed.
    /// When false, only manual FTP decreases are applied.
    /// </summary>
    public bool AllowDecreases { get; set; } = false;

    /// <summary>
    /// Minimal absolute decrease in watts required to accept an automatic eFTP decrease.
    /// Only used when <see cref="AllowDecreases"/> is true.
    /// </summary>
    public int MinDecreaseWatts { get; set; } = 10;

    /// <summary>
    /// Minimal relative decrease (fraction, e.g. 0.03 = 3%) required to accept an automatic eFTP decrease.
    /// If zero or negative, only the absolute threshold is considered.
    /// Only used when <see cref="AllowDecreases"/> is true.
    /// </summary>
    public double MinDecreasePercent { get; set; } = 0.0;
}

