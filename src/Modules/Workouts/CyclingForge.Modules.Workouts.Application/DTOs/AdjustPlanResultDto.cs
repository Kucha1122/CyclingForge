namespace CyclingForge.Modules.Workouts.Application.DTOs;

/// <summary>Outcome of a plan-day edit. Warnings are soft periodization advice (codes), never hard blocks.</summary>
public sealed record AdjustPlanResultDto(
    bool Success,
    IReadOnlyList<string> Warnings);
