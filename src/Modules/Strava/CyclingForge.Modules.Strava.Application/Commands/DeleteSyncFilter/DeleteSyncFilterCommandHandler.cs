using CyclingForge.Modules.Strava.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Strava.Application.Commands.DeleteSyncFilter;

internal sealed class DeleteSyncFilterCommandHandler : IRequestHandler<DeleteSyncFilterCommand>
{
    private readonly IActivitySyncFilterRepository _repository;

    public DeleteSyncFilterCommandHandler(IActivitySyncFilterRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(DeleteSyncFilterCommand command, CancellationToken cancellationToken)
    {
        var filter = await _repository.GetByIdAsync(command.FilterId, cancellationToken);
        if (filter is not null && filter.UserId == command.UserId)
        {
            await _repository.DeleteAsync(filter, cancellationToken);
        }
    }
}
