using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.UpdateWorkout;

internal sealed class UpdateWorkoutCommandHandler : IRequestHandler<UpdateWorkoutCommand>
{
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IClock _clock;

    public UpdateWorkoutCommandHandler(IWorkoutRepository workoutRepository, IClock clock)
    {
        _workoutRepository = workoutRepository;
        _clock = clock;
    }

    public async Task Handle(UpdateWorkoutCommand request, CancellationToken cancellationToken)
    {
        var workout = await _workoutRepository.GetByIdWithStepsAsync(request.WorkoutId, cancellationToken)
            ?? throw new InvalidOperationException("Workout not found.");

        if (!workout.IsOwnedBy(request.UserId))
            throw new UnauthorizedAccessException("You can only edit your own workouts.");

        var category = Enum.Parse<WorkoutCategory>(request.Category);
        var targetZone = Enum.Parse<TrainingZone>(request.TargetZone);

        workout.Update(
            request.Name,
            request.Description,
            category,
            targetZone,
            request.IsPublic,
            request.Tags,
            _clock.CurrentDate());

        var newSteps = request.Steps.OrderBy(s => s.Order).Select(stepDto =>
        {
            var stepType = Enum.Parse<StepType>(stepDto.Type);
            return WorkoutStep.Create(
                workout.Id,
                stepDto.Order,
                stepType,
                stepDto.DurationSeconds,
                stepDto.PowerLow,
                stepDto.PowerHigh,
                stepDto.Cadence,
                stepDto.Repeat,
                stepDto.OnDurationSeconds,
                stepDto.OffDurationSeconds,
                stepDto.OnPower,
                stepDto.OffPower,
                stepDto.OnCadence,
                stepDto.OffCadence);
        });

        workout.ReplaceSteps(newSteps);
        await _workoutRepository.UpdateAsync(workout, cancellationToken);
    }
}
