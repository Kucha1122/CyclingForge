using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.AdjustPlanDay;

internal sealed class AdjustPlanDayCommandHandler : IRequestHandler<AdjustPlanDayCommand, AdjustPlanResultDto>
{
    private static readonly HashSet<WorkoutCategory> HardCategories = new()
    {
        WorkoutCategory.SweetSpot, WorkoutCategory.Threshold, WorkoutCategory.VO2Max,
        WorkoutCategory.Anaerobic, WorkoutCategory.Sprint,
    };

    private readonly IDailyRecommendationRepository _repository;

    public AdjustPlanDayCommandHandler(IDailyRecommendationRepository repository)
    {
        _repository = repository;
    }

    public async Task<AdjustPlanResultDto> Handle(AdjustPlanDayCommand request, CancellationToken cancellationToken)
    {
        var rec = await _repository.GetByIdAsync(request.RecommendationId, cancellationToken)
            ?? throw new InvalidOperationException("Recommendation not found.");

        if (rec.UserId != request.UserId)
            throw new UnauthorizedAccessException("Access denied.");

        var warnings = new List<string>();
        var anchorDate = rec.Date;

        switch (request.Action.ToLowerInvariant())
        {
            case "rest":
                rec.MarkAsRest();
                await _repository.UpdateAsync(rec, cancellationToken);
                break;

            case "swap":
                if (!rec.SwapToAlternative())
                    warnings.Add("noAlternative");
                else
                    await _repository.UpdateAsync(rec, cancellationToken);
                break;

            case "move":
                if (request.TargetDate is not { } target)
                    throw new InvalidOperationException("TargetDate is required for move.");
                var other = await _repository.GetByUserIdAndDateAsync(request.UserId, target, cancellationToken);
                if (other is null)
                {
                    warnings.Add("targetNotAvailable");
                    return new AdjustPlanResultDto(false, warnings);
                }
                rec.SwapContentWith(other);
                await _repository.UpdateAsync(rec, cancellationToken);
                await _repository.UpdateAsync(other, cancellationToken);
                anchorDate = target < rec.Date ? target : rec.Date;
                break;

            default:
                throw new InvalidOperationException($"Unknown action '{request.Action}'.");
        }

        // Soft periodization advice: flag if the edit left two hard sessions on consecutive days.
        if (await HasAdjacentHardDaysAsync(request.UserId, anchorDate, cancellationToken))
            warnings.Add("adjacentHardDays");

        return new AdjustPlanResultDto(true, warnings);
    }

    private async Task<bool> HasAdjacentHardDaysAsync(Guid userId, DateOnly anchor, CancellationToken cancellationToken)
    {
        var start = anchor.AddDays(-2);
        var end = anchor.AddDays(2);
        var window = await _repository.GetByUserIdAndDateRangeAsync(userId, start, end, cancellationToken);
        var byDate = window.ToDictionary(r => r.Date);

        for (var d = start; d < end; d = d.AddDays(1))
        {
            if (IsHard(byDate.GetValueOrDefault(d)) && IsHard(byDate.GetValueOrDefault(d.AddDays(1))))
                return true;
        }
        return false;
    }

    private static bool IsHard(DailyRecommendation? rec) =>
        rec?.RecommendedWorkout is { } w && HardCategories.Contains(w.Category);
}
