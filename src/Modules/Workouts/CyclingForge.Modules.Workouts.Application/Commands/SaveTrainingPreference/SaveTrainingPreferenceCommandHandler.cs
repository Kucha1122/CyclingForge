using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.SaveTrainingPreference;

internal sealed class SaveTrainingPreferenceCommandHandler
    : IRequestHandler<SaveTrainingPreferenceCommand, TrainingPreferenceDto>
{
    private readonly ITrainingPreferenceRepository _repository;
    private readonly IClock _clock;

    public SaveTrainingPreferenceCommandHandler(ITrainingPreferenceRepository repository, IClock clock)
    {
        _repository = repository;
        _clock = clock;
    }

    public async Task<TrainingPreferenceDto> Handle(SaveTrainingPreferenceCommand request, CancellationToken cancellationToken)
    {
        var goal = Enum.Parse<TrainingGoal>(request.Goal);
        var level = Enum.Parse<FitnessLevel>(request.Level);
        var now = _clock.CurrentDate();

        var existing = await _repository.GetActiveByUserIdAsync(request.UserId, cancellationToken);

        if (existing is not null)
        {
            existing.Update(
                goal,
                request.DaysPerWeek,
                request.WeeklyHoursAvailable,
                request.PlanDurationWeeks,
                level,
                request.TargetEventDate,
                request.PreferredWorkoutMinutes,
                request.ConsiderNonCycling,
                now);

            await _repository.UpdateAsync(existing, cancellationToken);
            return existing.ToDto();
        }

        var preference = TrainingPreference.Create(
            request.UserId,
            goal,
            request.DaysPerWeek,
            request.WeeklyHoursAvailable,
            request.PlanDurationWeeks,
            level,
            request.TargetEventDate,
            request.PreferredWorkoutMinutes,
            request.ConsiderNonCycling,
            now);

        await _repository.AddAsync(preference, cancellationToken);
        return preference.ToDto();
    }
}
