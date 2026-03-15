using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Workouts.Application.Services;

namespace CyclingForge.Bootstrapper.Composition;

internal sealed class WorkoutImportFtpProvider : IWorkoutImportFtpProvider
{
    private readonly IUserFtpProvider _userFtpProvider;

    public WorkoutImportFtpProvider(IUserFtpProvider userFtpProvider)
    {
        _userFtpProvider = userFtpProvider;
    }

    public Task<int?> GetFtpAsync(Guid userId, CancellationToken cancellationToken = default)
        => _userFtpProvider.GetFtpAsync(userId, cancellationToken);
}
