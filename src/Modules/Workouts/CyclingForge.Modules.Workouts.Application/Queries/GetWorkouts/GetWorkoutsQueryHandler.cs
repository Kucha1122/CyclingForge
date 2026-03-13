using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Mappings;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.GetWorkouts;

internal sealed class GetWorkoutsQueryHandler : IRequestHandler<GetWorkoutsQuery, WorkoutSearchResultDto>
{
    private readonly IWorkoutRepository _workoutRepository;

    public GetWorkoutsQueryHandler(IWorkoutRepository workoutRepository)
    {
        _workoutRepository = workoutRepository;
    }

    public async Task<WorkoutSearchResultDto> Handle(GetWorkoutsQuery request, CancellationToken cancellationToken)
    {
        var category = !string.IsNullOrEmpty(request.Category)
            ? Enum.Parse<WorkoutCategory>(request.Category) : (WorkoutCategory?)null;
        var zone = !string.IsNullOrEmpty(request.Zone)
            ? Enum.Parse<TrainingZone>(request.Zone) : (TrainingZone?)null;
        var source = !string.IsNullOrEmpty(request.Source)
            ? Enum.Parse<WorkoutSource>(request.Source) : (WorkoutSource?)null;

        var workouts = await _workoutRepository.SearchAsync(
            request.UserId,
            category,
            zone,
            source,
            request.MinDuration,
            request.MaxDuration,
            request.SearchTerm,
            request.SortBy,
            request.Page,
            request.PageSize,
            cancellationToken);

        var totalCount = await _workoutRepository.CountAsync(
            request.UserId,
            category,
            zone,
            source,
            request.MinDuration,
            request.MaxDuration,
            request.SearchTerm,
            cancellationToken);

        var items = workouts.Select(w => w.ToSummaryDto()).ToList();

        return new WorkoutSearchResultDto(items, totalCount, request.Page, request.PageSize);
    }
}
