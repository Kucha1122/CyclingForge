using CyclingForge.Shared.Abstractions.Queries;

namespace CyclingForge.Modules.Garmin.Application.Queries.GetWellnessData;

public sealed record GetWellnessDataQuery(Guid UserId, DateOnly Date) : IQuery<WellnessDataDto?>;

public sealed record WellnessDataDto(
    DateOnly Date,
    float? Vo2MaxMlPerMinPerKg,
    int? TrainingReadinessScore,
    string? TrainingReadinessLevel,
    int? BodyBatteryMin,
    int? BodyBatteryMax,
    int? AverageStressLevel,
    int? StepsCount);
