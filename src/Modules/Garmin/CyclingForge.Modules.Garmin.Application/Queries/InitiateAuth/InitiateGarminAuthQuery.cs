using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Garmin.Application.Queries.InitiateAuth;

public sealed record InitiateGarminAuthQuery(Guid UserId) : IQuery<GarminAuthUrlDto>;

public sealed record GarminAuthUrlDto(string AuthorizeUrl);
