using CyclingForge.Modules.Workouts.Domain.Entities;

namespace CyclingForge.Modules.Workouts.Application.Services;

public interface IFitExportService
{
    /// <summary>
    /// Exports a workout to a FIT workout file (binary).
    /// </summary>
    byte[] ExportToFit(Workout workout);
}
