using CyclingForge.Modules.Garmin.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Commands.DisconnectGarmin;

internal sealed class DisconnectGarminCommandHandler : IRequestHandler<DisconnectGarminCommand>
{
    private readonly IGarminTokenRepository _tokenRepository;

    public DisconnectGarminCommandHandler(IGarminTokenRepository tokenRepository)
    {
        _tokenRepository = tokenRepository;
    }

    public async Task Handle(DisconnectGarminCommand request, CancellationToken cancellationToken)
    {
        var token = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        if (token is not null)
        {
            await _tokenRepository.DeleteAsync(token, cancellationToken);
        }
    }
}
