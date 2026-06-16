namespace CyclingForge.Modules.Workouts.Api.Requests;

public sealed record AdjustPlanDayRequest(string Action, DateOnly? TargetDate);
