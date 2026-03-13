using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.CreateWorkout;

public sealed record CreateWorkoutCommand(
    Guid UserId,
    string Name,
    string Description,
    string Category,
    string TargetZone,
    bool IsPublic,
    string? Tags,
    IReadOnlyList<CreateWorkoutStepDto> Steps) : ICommand<Guid>;

public sealed record CreateWorkoutStepDto(
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
