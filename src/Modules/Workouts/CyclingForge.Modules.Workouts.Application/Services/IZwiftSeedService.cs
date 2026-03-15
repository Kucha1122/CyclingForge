namespace CyclingForge.Modules.Workouts.Application.Services;

public interface IZwiftSeedService
{
    Task<int> SeedFromPathAsync(string directoryPath, CancellationToken cancellationToken = default);
}
