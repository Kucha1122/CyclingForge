using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.CreateWorkout;

internal sealed class CreateWorkoutCommandHandler : IRequestHandler<CreateWorkoutCommand, Guid>
{
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IClock _clock;

    public CreateWorkoutCommandHandler(IWorkoutRepository workoutRepository, IClock clock)
    {
        _workoutRepository = workoutRepository;
        _clock = clock;
    }

    public async Task<Guid> Handle(CreateWorkoutCommand request, CancellationToken cancellationToken)
    {
        var category = Enum.Parse<WorkoutCategory>(request.Category);
        var targetZone = Enum.Parse<TrainingZone>(request.TargetZone);

        var workout = Workout.Create(
            request.UserId,
            request.Name,
            request.Description,
            category,
            WorkoutSource.UserCreated,
            targetZone,
            request.IsPublic,
            request.Tags,
            _clock.CurrentDate());

        foreach (var stepDto in request.Steps.OrderBy(s => s.Order))
        {
            var stepType = Enum.Parse<StepType>(stepDto.Type);
            var step = WorkoutStep.Create(
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

            workout.AddStep(step);
        }

        await _workoutRepository.AddAsync(workout, cancellationToken);
        return workout.Id;
    }
}
