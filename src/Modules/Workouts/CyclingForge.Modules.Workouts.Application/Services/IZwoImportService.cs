using CyclingForge.Modules.Workouts.Domain.Entities;

namespace CyclingForge.Modules.Workouts.Application.Services;

public interface IZwoImportService
{
    Workout ParseZwo(string xmlContent, Guid? userId, DateTime createdAt);
    string ExportToZwo(Workout workout);
}
