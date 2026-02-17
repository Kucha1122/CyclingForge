using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.UpdateProfile;

public sealed record UpdateProfileCommand(Guid UserId, int? Ftp, float? WeightKg, int? Lthr, int? MaxHeartRate, int? RestingHeartRate, string? Gender, int? EftpMinDurationSeconds) : IRequest;
