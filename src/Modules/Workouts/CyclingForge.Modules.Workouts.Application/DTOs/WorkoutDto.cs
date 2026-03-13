namespace CyclingForge.Modules.Workouts.Application.DTOs;

public sealed record WorkoutDto(
    Guid Id,
    Guid? UserId,
    string Name,
    string Description,
    string Category,
    string Source,
    int DurationMinutes,
    int EstimatedTSS,
    string TargetZone,
    bool IsPublic,
    string? Tags,
    DateTime CreatedAt,
    IReadOnlyList<WorkoutStepDto> Steps);

public sealed record WorkoutStepDto(
    Guid Id,
    int Order,
    string Type,
    int DurationSeconds,
    decimal PowerLow,
    decimal PowerHigh,
    int? Cadence,
    int? Repeat,
    int? OnDurationSeconds,
    int? OffDurationSeconds,
    decimal? OnPower,
    decimal? OffPower);

public sealed record WorkoutSummaryDto(
    Guid Id,
    string Name,
    string Category,
    string Source,
    int DurationMinutes,
    int EstimatedTSS,
    string TargetZone,
    string? Tags);

public sealed record WorkoutSearchResultDto(
    IReadOnlyList<WorkoutSummaryDto> Items,
    int TotalCount,
    int Page,
    int PageSize);
