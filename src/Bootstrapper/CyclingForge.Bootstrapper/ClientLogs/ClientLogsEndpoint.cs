using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;

namespace CyclingForge.Bootstrapper.ClientLogs;

/// <summary>
/// Ingestion endpoint for client-side logs (web + mobile). Each received entry is
/// re-emitted through ILogger with source=client so it flows to stdout → Alloy → Loki,
/// landing in the same store as server logs. The endpoint is anonymous (so we also
/// capture errors from logged-out users) but bounded: a max number of entries per
/// request and a message-length cap guard against abuse.
/// </summary>
public static class ClientLogsEndpoint
{
    private const int MaxEntriesPerRequest = 50;
    private const int MaxMessageLength = 4000;
    private const int MaxStackLength = 8000;

    public static IEndpointRouteBuilder MapClientLogs(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/client-logs", (
            ClientLogBatch batch,
            HttpContext http,
            ILoggerFactory loggerFactory) =>
        {
            if (batch.Entries is null || batch.Entries.Count == 0)
                return Results.NoContent();

            var logger = loggerFactory.CreateLogger("CyclingForge.ClientLogs");
            var userId = http.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? http.User.FindFirstValue("sub")
                ?? "anonymous";

            var count = 0;
            foreach (var entry in batch.Entries)
            {
                if (++count > MaxEntriesPerRequest) break;
                if (string.IsNullOrWhiteSpace(entry.Message)) continue;

                var message = Truncate(entry.Message, MaxMessageLength);
                var stack = Truncate(entry.Stack, MaxStackLength);

                // Structured properties become fields in the Serilog JSON line.
                using (logger.BeginScope(new Dictionary<string, object?>
                {
                    ["source"] = "client",
                    ["platform"] = entry.Platform ?? batch.Platform ?? "unknown",
                    ["appVersion"] = entry.AppVersion ?? batch.AppVersion,
                    ["clientUserId"] = userId,
                    ["url"] = entry.Url,
                    ["context"] = entry.Context,
                    ["stack"] = stack,
                }))
                {
                    var level = ParseLevel(entry.Level);
                    logger.Log(level, "[client] {ClientMessage}", message);
                }
            }

            return Results.Accepted();
        })
        .AllowAnonymous()
        .WithName("IngestClientLogs");

        return app;
    }

    private static LogLevel ParseLevel(string? level) => level?.ToLowerInvariant() switch
    {
        "trace" or "verbose" => LogLevel.Trace,
        "debug" => LogLevel.Debug,
        "info" or "information" => LogLevel.Information,
        "warn" or "warning" => LogLevel.Warning,
        "error" => LogLevel.Error,
        "fatal" or "critical" => LogLevel.Critical,
        _ => LogLevel.Information,
    };

    private static string? Truncate(string? value, int max)
        => value is { Length: > 0 } && value.Length > max ? value[..max] : value;
}

public sealed class ClientLogBatch
{
    public string? Platform { get; set; }
    public string? AppVersion { get; set; }
    public List<ClientLogEntry>? Entries { get; set; }
}

public sealed class ClientLogEntry
{
    public string? Level { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Context { get; set; }
    public string? Platform { get; set; }
    public string? AppVersion { get; set; }
    public string? Url { get; set; }
    public string? Stack { get; set; }
}
