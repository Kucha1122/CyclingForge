using CyclingForge.Modules.Strava.Domain.Entities;
using CyclingForge.Modules.Strava.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Commands.AddSyncFilter;

internal sealed class AddSyncFilterCommandHandler : IRequestHandler<AddSyncFilterCommand>
{
    private readonly IActivitySyncFilterRepository _repository;
    private readonly IClock _clock;

    public AddSyncFilterCommandHandler(IActivitySyncFilterRepository repository, IClock clock)
    {
        _repository = repository;
        _clock = clock;
    }

    public async Task Handle(AddSyncFilterCommand command, CancellationToken cancellationToken)
    {
        var filter = ActivitySyncFilter.Create(command.UserId, command.ActivityType, command.ExcludedDevicePattern, _clock.CurrentDate());
        await _repository.AddAsync(filter, cancellationToken);
    }
}
