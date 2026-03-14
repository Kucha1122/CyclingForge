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
    private readonly IDailyRecommendationRepository _recommendationRepository;
    private readonly IClock _clock;

    public SaveTrainingPreferenceCommandHandler(
        ITrainingPreferenceRepository repository,
        IDailyRecommendationRepository recommendationRepository,
        IClock clock)
    {
        _repository = repository;
        _recommendationRepository = recommendationRepository;
        _clock = clock;
    }

    public async Task<TrainingPreferenceDto> Handle(SaveTrainingPreferenceCommand request, CancellationToken cancellationToken)
    {
        var goal = Enum.Parse<TrainingGoal>(request.Goal);
        var level = Enum.Parse<FitnessLevel>(request.Level);
        var planMode = Enum.Parse<PlanMode>(request.PlanMode);
        var now = _clock.CurrentDate();
        var today = DateOnly.FromDateTime(now);

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
                planMode,
                now);

            await _repository.UpdateAsync(existing, cancellationToken);
            await _recommendationRepository.DeleteByUserIdFromDateAsync(request.UserId, today, cancellationToken);

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
            planMode,
            now);

        await _repository.AddAsync(preference, cancellationToken);
        await _recommendationRepository.DeleteByUserIdFromDateAsync(request.UserId, today, cancellationToken);

        return preference.ToDto();
    }
}
