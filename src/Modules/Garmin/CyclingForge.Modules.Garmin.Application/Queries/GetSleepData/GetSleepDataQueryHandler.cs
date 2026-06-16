using System.Text.Json;
using CyclingForge.Modules.Garmin.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetSleepData;

internal sealed class GetSleepDataQueryHandler : IRequestHandler<GetSleepDataQuery, IEnumerable<SleepDataDto>>
{
    private static readonly JsonSerializerOptions _jsonOptions =
        new() { PropertyNameCaseInsensitive = true };

    private readonly IGarminSleepRepository _sleepRepository;

    public GetSleepDataQueryHandler(IGarminSleepRepository sleepRepository)
    {
        _sleepRepository = sleepRepository;
    }

    public async Task<IEnumerable<SleepDataDto>> Handle(GetSleepDataQuery request, CancellationToken cancellationToken)
    {
        var sleepData = await _sleepRepository.GetByUserIdAndDateRangeAsync(
            request.UserId, request.StartDate, request.EndDate, cancellationToken);

        return sleepData.Select(s =>
        {
            IReadOnlyList<SleepLevelDto> levels = [];
            if (s.SleepLevelsJson is not null)
            {
                levels = JsonSerializer.Deserialize<List<SleepLevelDto>>(s.SleepLevelsJson, _jsonOptions)
                    ?? [];
            }
            return new SleepDataDto(
                s.Date,
                s.TotalSleepSeconds,
                s.DeepSleepSeconds,
                s.LightSleepSeconds,
                s.RemSleepSeconds,
                s.AwakeSeconds,
                s.SleepScore,
                s.AverageSpO2,
                s.AverageRespirationRate,
                s.SleepStartTime,
                s.SleepEndTime,
                levels);
        });
    }
}
