using CyclingForge.Modules.Garmin.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetWellnessData;

internal sealed class GetWellnessDataQueryHandler : IRequestHandler<GetWellnessDataQuery, WellnessDataDto?>
{
    private readonly IGarminWellnessRepository _wellnessRepository;

    public GetWellnessDataQueryHandler(IGarminWellnessRepository wellnessRepository)
    {
        _wellnessRepository = wellnessRepository;
    }

    public async Task<WellnessDataDto?> Handle(GetWellnessDataQuery request, CancellationToken cancellationToken)
    {
        var wellness = await _wellnessRepository.GetByUserIdAndDateAsync(
            request.UserId, request.Date, cancellationToken);

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
