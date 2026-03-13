using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.ExportWorkoutToZwo;

internal sealed class ExportWorkoutToZwoQueryHandler : IRequestHandler<ExportWorkoutToZwoQuery, string?>
{
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IZwoImportService _zwoImportService;

    public ExportWorkoutToZwoQueryHandler(IWorkoutRepository workoutRepository, IZwoImportService zwoImportService)
    {
        _workoutRepository = workoutRepository;
        _zwoImportService = zwoImportService;
    }

    public async Task<string?> Handle(ExportWorkoutToZwoQuery request, CancellationToken cancellationToken)
    {
        var workout = await _workoutRepository.GetByIdWithStepsAsync(request.WorkoutId, cancellationToken);
        if (workout is null)
            return null;

        return _zwoImportService.ExportToZwo(workout);
    }
}
