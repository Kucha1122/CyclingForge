namespace CyclingForge.Modules.Users.Api.Requests;

public sealed record UpdateProfileRequest(int? Ftp, float? WeightKg, int? Lthr, int? MaxHeartRate, int? RestingHeartRate, string? Gender, int? EftpMinDurationSeconds, bool? EnableRpeFeedback);
