using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetSleepData;

public sealed record GetSleepDataQuery(Guid UserId, DateOnly StartDate, DateOnly EndDate) : IQuery<IEnumerable<SleepDataDto>>;

/// <param name="StartGmt">"YYYY-MM-DD HH:MM:SS" UTC string from Garmin sleepMovement.</param>
/// <param name="ActivityLevel">0=deep, 1=light, 2=rem, 3=awake.</param>
public sealed record SleepLevelDto(string StartGmt, string EndGmt, float ActivityLevel);

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
    DateTime? SleepEndTime,
    IReadOnlyList<SleepLevelDto> SleepLevels);
