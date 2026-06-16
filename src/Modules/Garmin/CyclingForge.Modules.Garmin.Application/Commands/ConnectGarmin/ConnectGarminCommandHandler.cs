using CyclingForge.Modules.Garmin.Application.Services;
using CyclingForge.Modules.Garmin.Domain.Entities;
using CyclingForge.Modules.Garmin.Domain.Exceptions;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using CyclingForge.Modules.Garmin.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Commands.ConnectGarmin;

internal sealed class ConnectGarminCommandHandler : IRequestHandler<ConnectGarminCommand>
{
    private readonly IGarminApiService _garminApiService;
    private readonly IGarminTokenRepository _tokenRepository;
    private readonly IClock _clock;

    public ConnectGarminCommandHandler(
        IGarminApiService garminApiService,
        IGarminTokenRepository tokenRepository,
        IClock clock)
    {
        _garminApiService = garminApiService;
        _tokenRepository = tokenRepository;
        _clock = clock;
    }

    public async Task Handle(ConnectGarminCommand request, CancellationToken cancellationToken)
    {
        var result = await _garminApiService.ConnectAsync(request.Email, request.Password, cancellationToken);

        if (result.NeedsMfa)
            throw new GarminMfaRequiredException(result.SessionId!);

        await SaveTokenAsync(request.UserId, result.Token!, cancellationToken);
    }

    internal async Task SaveTokenAsync(Guid userId, string session, CancellationToken ct)
    {
        var now = _clock.CurrentDate();
        var existing = await _tokenRepository.GetByUserIdAsync(userId, ct);
        if (existing is not null)
        {
            existing.UpdateToken(new AccessToken(session), now);
            await _tokenRepository.UpdateAsync(existing, ct);
        }
        else
        {
            var token = GarminToken.Create(userId, new AccessToken(session), now);
            await _tokenRepository.AddAsync(token, ct);
        }
    }
}
