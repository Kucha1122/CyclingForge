using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Exceptions;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Queries.GetAthleteProfile;

internal sealed class GetAthleteProfileQueryHandler : IRequestHandler<GetAthleteProfileQuery, AthleteProfileDto>
{
    private readonly IStravaAthleteRepository _athleteRepository;
    private readonly IStravaTokenRepository _tokenRepository;

    public GetAthleteProfileQueryHandler(
        IStravaAthleteRepository athleteRepository,
        IStravaTokenRepository tokenRepository)
    {
        _athleteRepository = athleteRepository;
        _tokenRepository = tokenRepository;
    }

    public async Task<AthleteProfileDto> Handle(GetAthleteProfileQuery request, CancellationToken cancellationToken)
    {
        var athlete = await _athleteRepository.GetByUserIdAsync(request.UserId, cancellationToken)
            ?? throw new NotFoundException("StravaAthlete", request.UserId);

        var token = await _tokenRepository.GetByUserIdAsync(request.UserId, cancellationToken);
        if (token is null)
        {
            throw new NotFoundException("StravaToken", request.UserId);
        }

        return new AthleteProfileDto(
            athlete.StravaId.Value,
            athlete.FirstName,
            athlete.LastName,
            athlete.ProfileImageUrl,
            athlete.City,
            athlete.Country);
    }
}
