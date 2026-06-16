namespace CyclingForge.Modules.Workouts.Api.Requests;

public sealed record SubmitSessionFeedbackRequest(int Rpe, string? LegsFeel, string? SessionQuality, string? Note);
