namespace CyclingForge.Shared.Abstractions.Exceptions;

public class NotFoundException : CyclingForgeException
{
    public NotFoundException(string entityName, object key)
        : base($"Entity '{entityName}' with key '{key}' was not found.")
    {
    }
}
