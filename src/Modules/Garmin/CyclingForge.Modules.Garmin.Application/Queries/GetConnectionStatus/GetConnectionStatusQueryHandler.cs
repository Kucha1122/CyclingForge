using CyclingForge.Modules.Garmin.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetConnectionStatus;

internal sealed class GetConnectionStatusQueryHandler : IRequestHandler<GetConnectionStatusQuery, ConnectionStatusDto>
{
    private readonly IGarminTokenRepository _tokenRepository;

    public GetConnectionStatusQueryHandler(IGarminTokenRepository tokenRepository)
    {
        _tokenRepository = tokenRepository;
    }

    public async Task<ConnectionStatusDto> Handle(GetConnectionStatusQuery request, CancellationToken cancellationToken)
    {
        var token = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        return new ConnectionStatusDto(token is not null, token?.CreatedAt);
    }
}
