using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Strava.Application.Commands.SyncSingleActivity;

/// <summary>
/// Synchronizes a single Strava activity in response to a webhook push event.
/// <paramref name="StravaAthleteId"/> is the Strava owner_id, <paramref name="ActivityId"/> the object_id,
/// and <paramref name="AspectType"/> one of "create", "update", "delete".
/// </summary>
/// <summary>Returns the internal UserId of the activity owner, or null if not found/delete.</summary>
public sealed record SyncSingleActivityCommand(long StravaAthleteId, long ActivityId, string AspectType) : ICommand<Guid?>;
