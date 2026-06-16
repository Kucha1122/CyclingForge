using CyclingForge.Modules.Garmin.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetHrvData;

internal sealed class GetHrvDataQueryHandler : IRequestHandler<GetHrvDataQuery, IEnumerable<HrvDataDto>>
{
    private readonly IGarminHrvRepository _hrvRepository;

    public GetHrvDataQueryHandler(IGarminHrvRepository hrvRepository)
    {
        _hrvRepository = hrvRepository;
    }

    public async Task<IEnumerable<HrvDataDto>> Handle(GetHrvDataQuery request, CancellationToken cancellationToken)
    {
        var hrvData = await _hrvRepository.GetByUserIdAndDateRangeAsync(
            request.UserId, request.StartDate, request.EndDate, cancellationToken);

        return hrvData.Select(h => new HrvDataDto(
            h.Date,
            h.LastNightAvgMs,
            h.LastNight5MinHighMs,
            h.Status));
    }
}
