using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;

namespace CyclingForge.Tools;

/// <summary>
/// Tool to validate CyclingForge training metrics calculations against Intervals.icu exported data.
/// Usage: Export activities from Intervals.icu as CSV, then run this tool to compare values.
/// </summary>
public class IntervalsIcuValidator
{
    public class ActivityComparison
    {
        public DateTime Date { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public float IntervalsLoad { get; set; }
        public float CyclingForgeLoad { get; set; }
        public float Difference { get; set; }
        public float PercentDifference { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class ValidationReport
    {
        public int TotalActivities { get; set; }
        public int MatchingActivities { get; set; }
        public int DifferingActivities { get; set; }
        public float AveragePercentDifference { get; set; }
        public Dictionary<string, float> SuggestedSportFactors { get; set; } = new();
        public List<ActivityComparison> DetailedComparisons { get; set; } = new();
    }

    /// <summary>
    /// Validates CyclingForge load calculations against Intervals.icu CSV export.
    /// </summary>
    /// <param name="intervalsCsvPath">Path to Intervals.icu activities export CSV</param>
    /// <param name="cyclingForgeCsvPath">Path to CyclingForge activities export CSV</param>
    /// <param name="tolerancePercent">Tolerance percentage for "matching" (default 5%)</param>
    /// <returns>Validation report with comparison results</returns>
    public ValidationReport ValidateAgainstIntervals(
        string intervalsCsvPath,
        string cyclingForgeCsvPath,
        float tolerancePercent = 5.0f)
    {
        Console.WriteLine("Loading Intervals.icu data...");
        var intervalsData = LoadIntervalsCsv(intervalsCsvPath);
        
        Console.WriteLine("Loading CyclingForge data...");
        var cyclingForgeData = LoadCyclingForgeCsv(cyclingForgeCsvPath);
        
        Console.WriteLine("Comparing activities...");
        var report = new ValidationReport();
        var sportFactorSums = new Dictionary<string, (float totalRatio, int count)>();
        
        foreach (var intervalsActivity in intervalsData)
        {
            var matchingActivity = cyclingForgeData.FirstOrDefault(cf => 
                cf.Date.Date == intervalsActivity.Date.Date && 
                cf.Name == intervalsActivity.Name);
            
            if (matchingActivity == null)
            {
                Console.WriteLine($"⚠ No matching activity found for: {intervalsActivity.Name} on {intervalsActivity.Date:yyyy-MM-dd}");
                continue;
            }
            
            report.TotalActivities++;
            
            var difference = matchingActivity.Load - intervalsActivity.Load;
            var percentDiff = intervalsActivity.Load > 0 
                ? Math.Abs(difference / intervalsActivity.Load * 100) 
                : 0;
            
            var comparison = new ActivityComparison
            {
                Date = intervalsActivity.Date,
                Name = intervalsActivity.Name,
                Type = intervalsActivity.Type,
                IntervalsLoad = intervalsActivity.Load,
                CyclingForgeLoad = matchingActivity.Load,
                Difference = difference,
                PercentDifference = percentDiff,
                Status = percentDiff <= tolerancePercent ? "✓ Match" : "✗ Differ"
            };
            
            report.DetailedComparisons.Add(comparison);
            
            if (percentDiff <= tolerancePercent)
            {
                report.MatchingActivities++;
            }
            else
            {
                report.DifferingActivities++;
                
                // Calculate suggested sport factor for this activity type
                if (matchingActivity.Load > 0)
                {
                    var suggestedFactor = intervalsActivity.Load / matchingActivity.Load;
                    if (!sportFactorSums.ContainsKey(intervalsActivity.Type))
                    {
                        sportFactorSums[intervalsActivity.Type] = (0, 0);
                    }
                    var current = sportFactorSums[intervalsActivity.Type];
                    sportFactorSums[intervalsActivity.Type] = (current.totalRatio + suggestedFactor, current.count + 1);
                }
            }
        }
        
        // Calculate average sport factors
        foreach (var (activityType, (totalRatio, count)) in sportFactorSums)
        {
            report.SuggestedSportFactors[activityType] = totalRatio / count;
        }
        
        report.AveragePercentDifference = report.TotalActivities > 0
            ? report.DetailedComparisons.Average(c => c.PercentDifference)
            : 0;
        
        return report;
    }

    private List<(DateTime Date, string Name, string Type, float Load)> LoadIntervalsCsv(string path)
    {
        var result = new List<(DateTime Date, string Name, string Type, float Load)>();
        var lines = File.ReadAllLines(path);
        
        if (lines.Length == 0)
        {
            throw new InvalidOperationException("CSV file is empty");
        }
        
        // Assume first line is header: Date,Name,Type,Load,...
        var headers = lines[0].Split(',');
        var dateIdx = Array.IndexOf(headers, "Date");
        var nameIdx = Array.IndexOf(headers, "Name");
        var typeIdx = Array.IndexOf(headers, "Type");
        var loadIdx = Array.IndexOf(headers, "Load");
        
        if (dateIdx == -1 || nameIdx == -1 || typeIdx == -1 || loadIdx == -1)
        {
            throw new InvalidOperationException("CSV must contain Date, Name, Type, and Load columns");
        }
        
        for (int i = 1; i < lines.Length; i++)
        {
            var values = lines[i].Split(',');
            if (values.Length <= Math.Max(Math.Max(dateIdx, nameIdx), Math.Max(typeIdx, loadIdx)))
            {
                continue;
            }
            
            if (DateTime.TryParse(values[dateIdx], out var date) &&
                float.TryParse(values[loadIdx], NumberStyles.Any, CultureInfo.InvariantCulture, out var load))
            {
                result.Add((date, values[nameIdx], values[typeIdx], load));
            }
        }
        
        return result;
    }

    private List<(DateTime Date, string Name, string Type, float Load)> LoadCyclingForgeCsv(string path)
    {
        // Same format as Intervals.icu for simplicity
        return LoadIntervalsCsv(path);
    }

    public void PrintReport(ValidationReport report)
    {
        Console.WriteLine("\n╔════════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║  Intervals.icu Validation Report                              ║");
        Console.WriteLine("╚════════════════════════════════════════════════════════════════╝\n");
        
        Console.WriteLine($"Total Activities Compared: {report.TotalActivities}");
        Console.WriteLine($"Matching (within tolerance): {report.MatchingActivities} ({report.MatchingActivities * 100.0 / report.TotalActivities:F1}%)");
        Console.WriteLine($"Differing: {report.DifferingActivities} ({report.DifferingActivities * 100.0 / report.TotalActivities:F1}%)");
        Console.WriteLine($"Average Difference: {report.AveragePercentDifference:F2}%\n");
        
        if (report.SuggestedSportFactors.Any())
        {
            Console.WriteLine("╔════════════════════════════════════════════════════════════════╗");
            Console.WriteLine("║  Suggested Sport Factor Adjustments                           ║");
            Console.WriteLine("╚════════════════════════════════════════════════════════════════╝\n");
            
            Console.WriteLine("Add to appsettings.json:\n");
            Console.WriteLine("\"ActivityLoadConfiguration\": {");
            Console.WriteLine("  \"SportFactors\": {");
            
            foreach (var (activityType, factor) in report.SuggestedSportFactors.OrderBy(x => x.Key))
            {
                Console.WriteLine($"    \"{activityType}\": {{");
                Console.WriteLine($"      \"TssMultiplier\": {factor:F2},");
                Console.WriteLine($"      \"UseHrss\": true");
                Console.WriteLine($"    }}{(activityType == report.SuggestedSportFactors.Keys.Last() ? "" : ",")}");
            }
            
            Console.WriteLine("  }");
            Console.WriteLine("}\n");
        }
        
        if (report.DifferingActivities > 0)
        {
            Console.WriteLine("╔════════════════════════════════════════════════════════════════╗");
            Console.WriteLine("║  Detailed Differences (Top 10)                                ║");
            Console.WriteLine("╚════════════════════════════════════════════════════════════════╝\n");
            
            var topDifferences = report.DetailedComparisons
                .Where(c => c.Status.Contains("Differ"))
                .OrderByDescending(c => Math.Abs(c.PercentDifference))
                .Take(10);
            
            Console.WriteLine($"{"Date",-12} {"Type",-15} {"Intervals",-12} {"CyclingForge",-12} {"Diff %",-10}");
            Console.WriteLine(new string('-', 65));
            
            foreach (var comparison in topDifferences)
            {
                Console.WriteLine($"{comparison.Date:yyyy-MM-dd}  {comparison.Type,-15} {comparison.IntervalsLoad,10:F1}  {comparison.CyclingForgeLoad,10:F1}  {comparison.PercentDifference,8:F1}%");
            }
        }
        
        Console.WriteLine("\n✓ Validation Complete");
    }
}

/// <summary>
/// Example usage:
/// 
/// var validator = new IntervalsIcuValidator();
/// var report = validator.ValidateAgainstIntervals(
///     "intervals_export.csv",
///     "cyclingforge_export.csv",
///     tolerancePercent: 5.0f
/// );
/// validator.PrintReport(report);
/// </summary>
public class Program
{
    public static void Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("Usage: IntervalsIcuValidator <intervals_csv> <cyclingforge_csv> [tolerance_percent]");
            Console.WriteLine("\nExample:");
            Console.WriteLine("  IntervalsIcuValidator intervals_export.csv cyclingforge_export.csv 5.0");
            Console.WriteLine("\nExport format (CSV):");
            Console.WriteLine("  Date,Name,Type,Load");
            Console.WriteLine("  2026-02-15,Morning Ride,Ride,65.3");
            return;
        }
        
        var intervalsCsv = args[0];
        var cyclingForgeCsv = args[1];
        var tolerance = args.Length > 2 ? float.Parse(args[2]) : 5.0f;
        
        try
        {
            var validator = new IntervalsIcuValidator();
            var report = validator.ValidateAgainstIntervals(intervalsCsv, cyclingForgeCsv, tolerance);
            validator.PrintReport(report);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
    }
}
