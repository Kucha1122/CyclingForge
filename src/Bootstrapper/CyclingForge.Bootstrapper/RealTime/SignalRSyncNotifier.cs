using CyclingForge.Shared.Abstractions.RealTime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CyclingForge.Bootstrapper.RealTime;

/// <summary>
/// <see cref="ISyncNotifier"/> implementation that pushes a "SyncCompleted" event to the user's
/// SignalR group. Best-effort: any failure is logged and swallowed so it never breaks a sync.
/// </summary>
internal sealed class SignalRSyncNotifier : ISyncNotifier
{
    private readonly IHubContext<SyncHub> _hubContext;
    private readonly ILogger<SignalRSyncNotifier> _logger;

    public SignalRSyncNotifier(IHubContext<SyncHub> hubContext, ILogger<SignalRSyncNotifier> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyAsync(Guid userId, SyncKind kind, int? count = null, CancellationToken cancellationToken = default)
    {
        try
        {
            // Lowercase kind keeps the client contract stable regardless of enum naming.
            var payload = new { kind = kind.ToString().ToLowerInvariant(), count };
            await _hubContext.Clients
                .Group(SyncHub.GroupForUser(userId))
                .SendAsync("SyncCompleted", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to push SyncCompleted notification to user {UserId}.", userId);
        }
    }
}
