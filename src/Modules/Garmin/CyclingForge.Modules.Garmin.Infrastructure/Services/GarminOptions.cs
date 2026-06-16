namespace CyclingForge.Modules.Garmin.Infrastructure.Services;

public sealed class GarminOptions
{
    public const string SectionName = "Garmin";

    /// <summary>Base URL of the Python garmin-connect microservice (e.g. http://garmin-python:8000).</summary>
    public string PythonServiceBaseUrl { get; set; } = "http://localhost:8000";
}
