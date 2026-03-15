using System.IO.Compression;
using System.Text;
using CyclingForge.Modules.Workouts.Application.DTOs;
using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Repositories;
using CyclingForge.Shared.Abstractions.Time;
using MediatR;

namespace CyclingForge.Modules.Workouts.Application.Commands.ImportWorkoutsFromZip;

internal sealed class ImportWorkoutsFromZipCommandHandler : IRequestHandler<ImportWorkoutsFromZipCommand, BulkImportZwoResult>
{
    private const int MaxFilesPerZip = 500;

    private readonly IZwoImportService _zwoImportService;
    private readonly IFitImportService _fitImportService;
    private readonly IWorkoutImportFtpProvider _ftpProvider;
    private readonly IWorkoutRepository _workoutRepository;
    private readonly IClock _clock;

    public ImportWorkoutsFromZipCommandHandler(
        IZwoImportService zwoImportService,
        IFitImportService fitImportService,
        IWorkoutImportFtpProvider ftpProvider,
        IWorkoutRepository workoutRepository,
        IClock clock)
    {
        _zwoImportService = zwoImportService;
        _fitImportService = fitImportService;
        _ftpProvider = ftpProvider;
        _workoutRepository = workoutRepository;
        _clock = clock;
    }

    public async Task<BulkImportZwoResult> Handle(ImportWorkoutsFromZipCommand request, CancellationToken cancellationToken)
    {
        var errors = new List<BulkImportZwoError>();
        var importedCount = 0;
        var now = _clock.CurrentDate();

        using var archive = new ZipArchive(request.ZipStream, ZipArchiveMode.Read);

        var zwoEntries = archive.Entries
            .Where(e => !e.FullName.EndsWith('/') && e.Name.EndsWith(".zwo", StringComparison.OrdinalIgnoreCase))
            .ToList();
        var fitEntries = archive.Entries
            .Where(e => !e.FullName.EndsWith('/') && e.Name.EndsWith(".fit", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (zwoEntries.Count == 0 && fitEntries.Count == 0)
        {
            return new BulkImportZwoResult(0, 0, [new BulkImportZwoError("", "No .zwo or .fit files found in the archive.")]);
        }

        var userFtp = await _ftpProvider.GetFtpAsync(request.UserId, cancellationToken);

        foreach (var entry in zwoEntries)
        {
            if (importedCount + errors.Count >= MaxFilesPerZip)
                break;

            var fileName = entry.FullName;
            try
            {
                await using var entryStream = entry.Open();
                using var reader = new StreamReader(entryStream, Encoding.UTF8);
                var xmlContent = await reader.ReadToEndAsync(cancellationToken);
                if (string.IsNullOrWhiteSpace(xmlContent))
                {
                    errors.Add(new BulkImportZwoError(fileName, "File is empty."));
                    continue;
                }

                var workout = _zwoImportService.ParseZwo(xmlContent, request.UserId, now);
                await _workoutRepository.AddAsync(workout, cancellationToken);
                importedCount++;
            }
            catch (Exception ex)
            {
                errors.Add(new BulkImportZwoError(fileName, ex.Message));
            }
        }

        foreach (var entry in fitEntries)
        {
            if (importedCount + errors.Count >= MaxFilesPerZip)
                break;

            var fileName = entry.FullName;
            try
            {
                await using var entryStream = entry.Open();
                // ZIP entry streams are not seekable; FIT parser needs Position = 0, so copy to MemoryStream.
                using var seekable = new MemoryStream();
                await entryStream.CopyToAsync(seekable, cancellationToken);
                seekable.Position = 0;
                var workout = _fitImportService.ParseFit(seekable, request.UserId, now, userFtp);
                await _workoutRepository.AddAsync(workout, cancellationToken);
                importedCount++;
            }
            catch (Exception ex)
            {
                errors.Add(new BulkImportZwoError(fileName, ex.Message));
            }
        }

        return new BulkImportZwoResult(importedCount, errors.Count, errors);
    }
}
