namespace CyclingForge.Modules.Activities.Application.Contracts;

public interface IActivitiesModuleApi
{
    Task<int> GetActivityCountAsync(Guid userId, CancellationToken cancellationToken = default);
}
