using CyclingForge.Modules.Users.Domain.Entities;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Exceptions;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Users.Application.Commands.UpdateProfile;

internal sealed class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand>
{
    private const string SourceManual = "Manual";

    private readonly IUserRepository _userRepository;
    private readonly IUserFtpChangeRepository _ftpChangeRepository;
    private readonly IClock _clock;

    public UpdateProfileCommandHandler(
        IUserRepository userRepository,
        IUserFtpChangeRepository ftpChangeRepository,
        IClock clock)
    {
        _userRepository = userRepository;
        _ftpChangeRepository = ftpChangeRepository;
        _clock = clock;
    }

    public async Task Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(new UserId(request.UserId));
        if (user is null)
        {
            throw new NotFoundException("User", request.UserId);
        }

        var previousFtp = user.FunctionalThresholdPower;
        user.UpdateProfile(request.Ftp, request.WeightKg, request.Lthr, request.EftpMinDurationSeconds, request.MaxHeartRate, request.RestingHeartRate, request.Gender);
        await _userRepository.UpdateAsync(user);

        if (request.Ftp.HasValue && request.Ftp.Value != previousFtp)
        {
            var change = UserFtpChange.Create(user.Id.Value, _clock.CurrentDate(), request.Ftp.Value, SourceManual);
            await _ftpChangeRepository.AddAsync(change, cancellationToken);
        }
    }
}
