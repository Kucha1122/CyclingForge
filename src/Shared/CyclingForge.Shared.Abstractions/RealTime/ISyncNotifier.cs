namespace CyclingForge.Shared.Abstractions.RealTime;

/// <summary>
/// The kind of data that was synchronized, so clients can show an appropriate message
/// and decide what to refresh.
/// </summary>
public enum SyncKind
{
    /// <summary>New or updated training activities (e.g. from Strava).</summary>
    Activity,

    /// <summary>Garmin wellness/sleep/HRV data.</summary>
    Garmin,
}

/// <summary>
/// Pushes a lightweight "data changed" signal to a user's connected clients (web + mobile)
/// so their open views can refetch immediately after a background or manual sync.
/// Implementations must be best-effort: a delivery failure must never break the sync pipeline.
/// </summary>
public interface ISyncNotifier
{
    /// <summary>
    /// Notify all of <paramref name="userId"/>'s connected clients that a sync of
    /// <paramref name="kind"/> completed. <paramref name="count"/> is an optional number of
    /// new/updated items (e.g. synced activities) for display.
    /// </summary>
    Task NotifyAsync(Guid userId, SyncKind kind, int? count = null, CancellationToken cancellationToken = default);
}
