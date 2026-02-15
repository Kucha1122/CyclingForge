using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Exceptions;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Queries.GetAthleteProfile;

internal sealed class GetAthleteProfileQueryHandler : IRequestHandler<GetAthleteProfileQuery, AthleteProfileDto>
{
    private readonly IStravaAthleteRepository _athleteRepository;

    public GetAthleteProfileQueryHandler(IStravaAthleteRepository athleteRepository)
    {
        _athleteRepository = athleteRepository;
    }

    public async Task<AthleteProfileDto> Handle(GetAthleteProfileQuery request, CancellationToken cancellationToken)
    {
        var athlete = await _athleteRepository.GetByUserIdAsync(request.UserId, cancellationToken)
            ?? throw new NotFoundException("StravaAthlete", request.UserId);

        return new AthleteProfileDto(
            athlete.StravaId.Value,
            athlete.FirstName,
            athlete.LastName,
            athlete.ProfileImageUrl,
            athlete.City,
            athlete.Country);
    }
}
