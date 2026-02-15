using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Users.Application.Queries.GetUser;

public sealed record GetUserQuery(Guid UserId) : IQuery<UserDto>;
