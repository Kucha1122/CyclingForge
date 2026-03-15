using CyclingForge.Modules.Workouts.Domain.Entities;

namespace CyclingForge.Modules.Workouts.Application.Services;

public interface IFitImportService
{
    /// <summary>
    /// Parses a FIT workout file stream and returns a <see cref="Workout"/> entity.
    /// </summary>
    /// <param name="fitStream">Stream containing the FIT file (workout type only).</param>
    /// <param name="userId">Optional user ID to assign the workout to.</param>
    /// <param name="createdAt">Creation timestamp for the workout.</param>
    /// <param name="userFtpWatts">Optional user FTP in watts. When provided, power values from the FIT (Zwift/Garmin watts) are converted to % FTP.</param>
    /// <returns>The parsed workout with steps.</returns>
    /// <exception cref="InvalidOperationException">When the file is not a FIT workout file or is invalid.</exception>
    Workout ParseFit(Stream fitStream, Guid? userId, DateTime createdAt, int? userFtpWatts = null);
}
