using System.Text.Json;

namespace CyclingForge.Modules.Strava.Application.Services;

/// <summary>
/// Computes time spent in each heart-rate zone from a Strava activity's stored streams JSON.
/// Streams are an array of <c>{ "type": "...", "data": [...] }</c> objects; we use the
/// "heartrate" and "time" streams. Time is cumulative seconds from the start; the duration of
/// each sample is the gap to the next timestamp, clamped to avoid inflating paused gaps.
/// </summary>
public static class HrTimeInZoneCalculator
{
    // A single sample should never represent more than this many seconds (guards against
    // long pauses / GPS gaps being attributed entirely to one heart-rate reading).
    private const int MaxSampleSeconds = 60;

    public sealed record HrZone(int Min, int Max);

    /// <summary>
    /// Returns seconds spent in each zone (same length and order as <paramref name="zones"/>).
    /// Returns an all-zero array when streams or heart-rate data are missing.
    /// </summary>
    public static int[] Compute(string? streamsJson, IReadOnlyList<HrZone> zones)
    {
        var result = new int[zones.Count];
        if (string.IsNullOrWhiteSpace(streamsJson) || zones.Count == 0)
            return result;

        double[]? heartrate = null;
        double[]? time = null;

        try
        {
            using var doc = JsonDocument.Parse(streamsJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
                return result;

            foreach (var stream in doc.RootElement.EnumerateArray())
            {
                if (!stream.TryGetProperty("type", out var typeEl) ||
                    !stream.TryGetProperty("data", out var dataEl) ||
                    dataEl.ValueKind != JsonValueKind.Array)
                    continue;

                var type = typeEl.GetString();
                if (type == "heartrate")
                    heartrate = ReadNumbers(dataEl);
                else if (type == "time")
                    time = ReadNumbers(dataEl);
            }
        }
        catch (JsonException)
        {
            return result;
        }

        if (heartrate is null || heartrate.Length == 0)
            return result;

        for (var i = 0; i < heartrate.Length; i++)
        {
            var hr = heartrate[i];
            if (hr <= 0)
                continue;

            var seconds = SampleSeconds(time, i);
            var zoneIndex = ResolveZoneIndex(hr, zones);
            result[zoneIndex] += seconds;
        }

        return result;
    }

    private static int SampleSeconds(double[]? time, int index)
    {
        if (time is null || index >= time.Length)
            return 1; // assume 1 Hz sampling when no time stream is available

        // Duration represented by this sample = gap to the next timestamp.
        var delta = index + 1 < time.Length
            ? time[index + 1] - time[index]
            : 1;

        if (delta <= 0)
            return 0;

        return (int)Math.Min(delta, MaxSampleSeconds);
    }

    private static int ResolveZoneIndex(double hr, IReadOnlyList<HrZone> zones)
    {
        for (var z = 0; z < zones.Count; z++)
        {
            var zone = zones[z];
            // Strava marks the open-ended top zone with Max <= 0.
            var hasUpperBound = zone.Max > 0;
            if (hr >= zone.Min && (!hasUpperBound || hr < zone.Max))
                return z;
        }

        // Below the first zone's minimum -> lowest zone; otherwise the highest.
        return hr < zones[0].Min ? 0 : zones.Count - 1;
    }

    private static double[] ReadNumbers(JsonElement array)
    {
        var values = new double[array.GetArrayLength()];
        var i = 0;
        foreach (var el in array.EnumerateArray())
        {
            values[i++] = el.ValueKind == JsonValueKind.Number ? el.GetDouble() : 0;
        }
        return values;
    }
}
