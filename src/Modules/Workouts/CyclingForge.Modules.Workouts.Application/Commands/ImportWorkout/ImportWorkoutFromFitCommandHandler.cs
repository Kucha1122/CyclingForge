using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.ImportWorkout;

internal sealed class ImportWorkoutFromFitCommandHandler : IRequestHandler<ImportWorkoutFromFitCommand, Guid>
{
    private readonly IFitImportService _fitImportService;
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IWorkoutImportFtpProvider _ftpProvider;
    private readonly IClock _clock;

    public ImportWorkoutFromFitCommandHandler(
        IFitImportService fitImportService,
        IWorkoutRepository workoutRepository,
        IWorkoutImportFtpProvider ftpProvider,
        IClock clock)
    {
        _fitImportService = fitImportService;
        _workoutRepository = workoutRepository;
        _ftpProvider = ftpProvider;
        _clock = clock;
    }

    public async Task<Guid> Handle(ImportWorkoutFromFitCommand request, CancellationToken cancellationToken)
    {
        var userFtp = await _ftpProvider.GetFtpAsync(request.UserId, cancellationToken);
        var workout = _fitImportService.ParseFit(request.FitStream, request.UserId, _clock.CurrentDate(), userFtp);
        await _workoutRepository.AddAsync(workout, cancellationToken);
        return workout.Id;
    }
}
