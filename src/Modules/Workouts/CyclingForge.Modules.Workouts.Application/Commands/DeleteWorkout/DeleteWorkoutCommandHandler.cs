using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.DeleteWorkout;

internal sealed class DeleteWorkoutCommandHandler : IRequestHandler<DeleteWorkoutCommand>
{
    private readonly IWorkoutRepository _workoutRepository;

    public DeleteWorkoutCommandHandler(IWorkoutRepository workoutRepository)
    {
        _workoutRepository = workoutRepository;
    }

    public async Task Handle(DeleteWorkoutCommand request, CancellationToken cancellationToken)
    {
        var workout = await _workoutRepository.GetByIdAsync(request.WorkoutId, cancellationToken)
            ?? throw new InvalidOperationException("Workout not found.");

        if (!workout.IsOwnedBy(request.UserId))
            throw new UnauthorizedAccessException("You can only delete your own workouts.");

        await _workoutRepository.DeleteAsync(workout, cancellationToken);
    }
}
