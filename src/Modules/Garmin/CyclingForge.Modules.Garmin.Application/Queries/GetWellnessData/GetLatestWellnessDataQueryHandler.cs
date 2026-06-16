using CyclingForge.Modules.Garmin.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetWellnessData;

internal sealed class GetLatestWellnessDataQueryHandler : IRequestHandler<GetLatestWellnessDataQuery, WellnessDataDto?>
{
    private readonly IGarminWellnessRepository _wellnessRepository;

    public GetLatestWellnessDataQueryHandler(IGarminWellnessRepository wellnessRepository)
    {
        _wellnessRepository = wellnessRepository;
    }

    public async Task<WellnessDataDto?> Handle(GetLatestWellnessDataQuery request, CancellationToken cancellationToken)
    {
        var wellness = await _wellnessRepository.GetLatestByUserIdAsync(
            request.UserId, request.OnOrBefore, cancellationToken);

        if (wellness is null) return null;

        return new WellnessDataDto(
            wellness.Date,
            wellness.Vo2MaxMlPerMinPerKg,
            wellness.TrainingReadinessScore,
            wellness.TrainingReadinessLevel,
            wellness.BodyBatteryMin,
            wellness.BodyBatteryMax,
            wellness.AverageStressLevel,
            wellness.StepsCount);
    }
}
