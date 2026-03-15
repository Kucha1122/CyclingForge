using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Queries.ExportWorkoutToFit;

internal sealed class ExportWorkoutToFitQueryHandler : IRequestHandler<ExportWorkoutToFitQuery, byte[]?>
{
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IFitExportService _fitExportService;

    public ExportWorkoutToFitQueryHandler(IWorkoutRepository workoutRepository, IFitExportService fitExportService)
    {
        _workoutRepository = workoutRepository;
        _fitExportService = fitExportService;
    }

    public async Task<byte[]?> Handle(ExportWorkoutToFitQuery request, CancellationToken cancellationToken)
    {
        var workout = await _workoutRepository.GetByIdWithStepsAsync(request.WorkoutId, cancellationToken);
        if (workout is null)
            return null;

        return _fitExportService.ExportToFit(workout);
    }
}
