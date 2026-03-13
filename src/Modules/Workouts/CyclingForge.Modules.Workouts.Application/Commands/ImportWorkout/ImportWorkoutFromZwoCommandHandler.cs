using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.ImportWorkout;

internal sealed class ImportWorkoutFromZwoCommandHandler : IRequestHandler<ImportWorkoutFromZwoCommand, Guid>
{
    private readonly IZwoImportService _zwoImportService;
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IClock _clock;

    public ImportWorkoutFromZwoCommandHandler(
        IZwoImportService zwoImportService,
        IWorkoutRepository workoutRepository,
        IClock clock)
    {
        _zwoImportService = zwoImportService;
        _workoutRepository = workoutRepository;
        _clock = clock;
    }

    public async Task<Guid> Handle(ImportWorkoutFromZwoCommand request, CancellationToken cancellationToken)
    {
        var workout = _zwoImportService.ParseZwo(request.ZwoXmlContent, request.UserId, _clock.CurrentDate());
        await _workoutRepository.AddAsync(workout, cancellationToken);
        return workout.Id;
    }
}
