using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CyclingForge.Bootstrapper.RealTime;

/// <summary>
/// SignalR hub clients connect to for real-time "data changed" signals. Each connection is added to
/// a group keyed by the authenticated user id, so <see cref="SignalRSyncNotifier"/> can target a
/// single user across all of their devices. The hub carries no data — it only signals clients to
/// refetch through the existing REST APIs.
/// </summary>
[Authorize]
public sealed class SyncHub : Hub
{
    /// <summary>Builds the per-user group name used for targeted broadcasts.</summary>
    public static string GroupForUser(Guid userId) => $"user:{userId}";

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupForUser(userId.Value));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId is not null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupForUser(userId.Value));
        }

        await base.OnDisconnectedAsync(exception);
    }

    private Guid? GetUserId()
    {
        var sub = Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
