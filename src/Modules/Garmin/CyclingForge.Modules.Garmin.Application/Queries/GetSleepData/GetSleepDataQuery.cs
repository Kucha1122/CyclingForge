using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetSleepData;

public sealed record GetSleepDataQuery(Guid UserId, DateOnly StartDate, DateOnly EndDate) : IQuery<IEnumerable<SleepDataDto>>;

public sealed record SleepDataDto(
    DateOnly Date,
    int TotalSleepSeconds,
    int DeepSleepSeconds,
    int LightSleepSeconds,
    int RemSleepSeconds,
    int AwakeSeconds,
    int? SleepScore,
    float? AverageSpO2,
    float? AverageRespirationRate,
    DateTime? SleepStartTime,
    DateTime? SleepEndTime);
