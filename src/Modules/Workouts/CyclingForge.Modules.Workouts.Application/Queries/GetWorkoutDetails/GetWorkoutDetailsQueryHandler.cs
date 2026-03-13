using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetWorkoutDetails;

internal sealed class GetWorkoutDetailsQueryHandler : IRequestHandler<GetWorkoutDetailsQuery, WorkoutDto?>
{
    private readonly IWorkoutRepository _workoutRepository;

    public GetWorkoutDetailsQueryHandler(IWorkoutRepository workoutRepository)
    {
        _workoutRepository = workoutRepository;
    }

    public async Task<WorkoutDto?> Handle(GetWorkoutDetailsQuery request, CancellationToken cancellationToken)
    {
        var workout = await _workoutRepository.GetByIdWithStepsAsync(request.WorkoutId, cancellationToken);
        return workout?.ToDto();
    }
}
