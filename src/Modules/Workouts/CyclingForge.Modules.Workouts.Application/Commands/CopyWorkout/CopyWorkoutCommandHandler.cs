using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.CopyWorkout;

internal sealed class CopyWorkoutCommandHandler : IRequestHandler<CopyWorkoutCommand, Guid>
{
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IClock _clock;

    public CopyWorkoutCommandHandler(IWorkoutRepository workoutRepository, IClock clock)
    {
        _workoutRepository = workoutRepository;
        _clock = clock;
    }

    public async Task<Guid> Handle(CopyWorkoutCommand request, CancellationToken cancellationToken)
    {
        var source = await _workoutRepository.GetByIdWithStepsAsync(request.WorkoutId, cancellationToken)
            ?? throw new InvalidOperationException($"Workout {request.WorkoutId} not found.");

        var copy = Workout.Create(
            request.UserId,
            $"Copy of {source.Name}",
            source.Description,
            source.Category,
            WorkoutSource.UserCreated,
            source.TargetZone,
            isPublic: false,
            source.Tags,
            _clock.CurrentDate());

        foreach (var step in source.Steps.OrderBy(s => s.Order))
        {
            var copiedStep = WorkoutStep.Create(
                copy.Id,
                step.Order,
                step.Type,
                step.DurationSeconds,
                step.PowerLow,
                step.PowerHigh,
                step.Cadence,
                step.Repeat,
                step.OnDurationSeconds,
                step.OffDurationSeconds,
                step.OnPower,
                step.OffPower,
                step.OnCadence,
                step.OffCadence);

            copy.AddStep(copiedStep);
        }

        await _workoutRepository.AddAsync(copy, cancellationToken);
        return copy.Id;
    }
}
