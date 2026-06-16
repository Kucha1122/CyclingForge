using CyclingForge.Modules.Garmin.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Exceptions;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Commands.ConnectGarmin;

internal sealed class ConnectGarminMfaCommandHandler : IRequestHandler<ConnectGarminMfaCommand>
{
    private readonly IGarminApiService _garminApiService;
    private readonly IGarminTokenRepository _tokenRepository;
    private readonly IClock _clock;

    public ConnectGarminMfaCommandHandler(
        IGarminApiService garminApiService,
        IGarminTokenRepository tokenRepository,
        IClock clock)
    {
        _garminApiService = garminApiService;
        _tokenRepository = tokenRepository;
        _clock = clock;
    }

    public async Task Handle(ConnectGarminMfaCommand request, CancellationToken cancellationToken)
    {
        var session = await _garminApiService.ConnectMfaAsync(request.SessionId, request.MfaCode, cancellationToken);

        var helper = new ConnectGarminCommandHandler(_garminApiService, _tokenRepository, _clock);
        await helper.SaveTokenAsync(request.UserId, session, cancellationToken);
    }
}
