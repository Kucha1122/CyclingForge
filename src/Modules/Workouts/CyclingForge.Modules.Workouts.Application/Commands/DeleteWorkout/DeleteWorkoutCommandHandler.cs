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

        // Users can delete their own workouts and shared system workouts; only other users'
        // private workouts are protected.
        if (!workout.IsOwnedBy(request.UserId) && !workout.IsSystemWorkout)
            throw new UnauthorizedAccessException("You can only delete your own or system workouts.");

        await _workoutRepository.DeleteAsync(workout, cancellationToken);
    }
}
