using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Shared.Abstractions.Commands;

namespace CyclingForge.Modules.Workouts.Application.Commands.AdjustPlanDay;

/// <summary>Edits a single plan day. Action: "rest" | "swap" | "move". TargetDate is required for "move".</summary>
public sealed record AdjustPlanDayCommand(
    Guid UserId,
    Guid RecommendationId,
    string Action,
    DateOnly? TargetDate) : ICommand<AdjustPlanResultDto>;
