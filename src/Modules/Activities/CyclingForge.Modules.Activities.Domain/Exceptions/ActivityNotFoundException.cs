using CyclingForge.Shared.Abstractions.Exceptions;

namespace CyclingForge.Modules.Activities.Domain.Exceptions;

public sealed class ActivityNotFoundException : CyclingForgeException
{
    public ActivityNotFoundException(Guid activityId)
        : base($"Activity with ID '{activityId}' was not found.")
    {
    }
}
