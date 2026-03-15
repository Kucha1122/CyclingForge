using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.DeleteAllUserWorkouts;

internal sealed class DeleteAllUserWorkoutsCommandHandler : IRequestHandler<DeleteAllUserWorkoutsCommand>
{
    private readonly IWorkoutRepository _workoutRepository;

    public DeleteAllUserWorkoutsCommandHandler(IWorkoutRepository workoutRepository)
    {
        _workoutRepository = workoutRepository;
    }

    public async Task Handle(DeleteAllUserWorkoutsCommand request, CancellationToken cancellationToken)
    {
        await _workoutRepository.DeleteAllByUserIdAsync(request.UserId, cancellationToken);
    }
}
