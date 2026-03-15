using CyclingForge.Modules.Workouts.Application.Services;
using CyclingForge.Modules.Workouts.Domain.Entities;
using CyclingForge.Modules.Workouts.Domain.Enums;
using CyclingForge.Modules.Workouts.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CyclingForge.Modules.Workouts.Infrastructure.Services;

internal sealed class ZwiftSeedService : IZwiftSeedService
{
    private readonly WorkoutsDbContext _context;
    private readonly IZwoImportService _zwoImportService;
    private readonly ILogger<ZwiftSeedService> _logger;

    public ZwiftSeedService(
        WorkoutsDbContext context,
        IZwoImportService zwoImportService,
        ILogger<ZwiftSeedService> logger)
    {
        _context = context;
        _zwoImportService = zwoImportService;
        _logger = logger;
    }

    public async Task<int> SeedFromPathAsync(string directoryPath, CancellationToken cancellationToken = default)
    {
        if (!Directory.Exists(directoryPath))
        {
            _logger.LogWarning("Zwift seed path does not exist: {Path}", directoryPath);
            return 0;
        }

        var existingKeys = await _context.Workouts
            .Where(w => w.Source == WorkoutSource.System)
            .Select(w => new { w.Name, w.DurationMinutes })
            .ToListAsync(cancellationToken);
        var keySet = existingKeys.Select(k => (k.Name, k.DurationMinutes)).ToHashSet();

        var zwoFiles = Directory.EnumerateFiles(directoryPath, "*.zwo", SearchOption.TopDirectoryOnly).ToList();
        var toAdd = new List<Workout>();
        var now = DateTime.UtcNow;

        foreach (var filePath in zwoFiles)
        {
            try
            {
                var xmlContent = await File.ReadAllTextAsync(filePath, cancellationToken);
                var workout = _zwoImportService.ParseZwo(xmlContent, userId: null, now);
                workout.Update(
                    workout.Name,
                    workout.Description,
                    workout.Category,
                    workout.TargetZone,
                    isPublic: true,
                    workout.Tags,
                    now);

                var key = (workout.Name, workout.DurationMinutes);
                if (keySet.Contains(key))
                    continue;

                keySet.Add(key);
                toAdd.Add(workout);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skipping invalid or unreadable ZWO file: {File}", filePath);
            }
        }

        if (toAdd.Count > 0)
        {
            await _context.Workouts.AddRangeAsync(toAdd, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return toAdd.Count;
    }
}
