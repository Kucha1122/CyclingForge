using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetConnectionStatus;

public sealed record GetConnectionStatusQuery(Guid UserId) : IQuery<ConnectionStatusDto>;

public sealed record ConnectionStatusDto(bool IsConnected, DateTime? ConnectedAt);
