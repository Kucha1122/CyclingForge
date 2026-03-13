namespace CyclingForge.Modules.Workouts.Api.Requests;

public sealed record UpdateRecommendationStatusRequest(string Status, Guid? CompletedActivityId);
