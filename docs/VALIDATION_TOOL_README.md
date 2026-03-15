# Intervals.icu Validation Tool

A command-line tool to validate CyclingForge training metrics calculations against Intervals.icu exported data.

## Purpose

This tool helps you:
- Compare CyclingForge Load calculations with Intervals.icu Load values
- Identify activities where calculations differ significantly
- Generate suggested sport factor adjustments for better accuracy
- Validate that your configuration matches Intervals.icu behavior

## Prerequisites

1. Intervals.icu account with historical activity data
2. CyclingForge installation with synced activities
3. .NET 8.0 SDK installed

## Usage

### Step 1: Export from Intervals.icu

1. Go to Intervals.icu → Activities
2. Filter to desired date range (e.g., last 90 days)
3. Click "..." menu → Export → CSV
4. Ensure CSV includes columns: Date, Name, Type, Load
5. Save as `intervals_export.csv`

**Example Intervals.icu CSV:**
```csv
Date,Name,Type,Load,Duration
2026-02-15,Morning Ride,Ride,65.3,3600
2026-02-14,Easy Walk,Walk,10.2,1800
2026-02-13,Threshold Ride,Ride,85.7,4200
```

### Step 2: Export from CyclingForge

Use the API or create a simple export:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/activities/export?format=csv" \
  > cyclingforge_export.csv
```

**Required CSV format (same as Intervals.icu):**
```csv
Date,Name,Type,Load
2026-02-15,Morning Ride,Ride,68.1
2026-02-14,Easy Walk,Walk,30.5
2026-02-13,Threshold Ride,Ride,84.2
```

### Step 3: Run the Validator

```bash
cd tools
dotnet run --project IntervalsIcuValidator.csproj intervals_export.csv cyclingforge_export.csv 5.0
```

**Parameters:**
- `intervals_export.csv`: Path to Intervals.icu CSV export
- `cyclingforge_export.csv`: Path to CyclingForge CSV export
- `5.0`: Tolerance percentage (default: 5%) - activities within this % are considered matching

## Interpreting Results

### Sample Output

```
╔════════════════════════════════════════════════════════════════╗
║  Intervals.icu Validation Report                              ║
╚════════════════════════════════════════════════════════════════╝

Total Activities Compared: 45
Matching (within tolerance): 38 (84.4%)
Differing: 7 (15.6%)
Average Difference: 3.2%

╔════════════════════════════════════════════════════════════════╗
║  Suggested Sport Factor Adjustments                           ║
╚════════════════════════════════════════════════════════════════╝

Add to appsettings.json:

"ActivityLoadConfiguration": {
  "SportFactors": {
    "Walk": {
      "TssMultiplier": 0.33,
      "UseHrss": true
    },
    "Run": {
      "TssMultiplier": 0.88,
      "UseHrss": true
    }
  }
}

╔════════════════════════════════════════════════════════════════╗
║  Detailed Differences (Top 10)                                ║
╚════════════════════════════════════════════════════════════════╝

Date         Type            Intervals    CyclingForge  Diff %    
-----------------------------------------------------------------
2026-02-14  Walk                    10.2          30.5     199.0%
2026-02-10  Walk                     8.5          25.3     197.6%
2026-02-08  Ride                    45.2          52.1      15.3%

✓ Validation Complete
```

### Understanding the Report

**Matching Activities (84.4%):**
- Activities where Load differs by ≤5% (or your specified tolerance)
- Indicates good calibration for these activity types

**Differing Activities (15.6%):**
- Activities with Load differences >5%
- Review these for sport factor calibration

**Suggested Sport Factors:**
- Automatically calculated from the differences
- Copy to `appsettings.json` to improve accuracy
- Average of all activities of that type

**Detailed Differences:**
- Shows worst mismatches for investigation
- High % differences indicate need for calibration

## Common Scenarios

### Scenario 1: Walking Shows 200% Difference

**Problem:**
```
Walk        Intervals: 10     CyclingForge: 30    Diff: 200%
```

**Solution:**
The suggested sport factor for Walk is 0.33 (10/30). Add to configuration:

```json
{
  "ActivityLoadConfiguration": {
    "SportFactors": {
      "Walk": {
        "TssMultiplier": 0.33,
        "UseHrss": true
      }
    }
  }
}
```

### Scenario 2: All Activities Match

**Result:**
```
Matching (within tolerance): 45 (100%)
Average Difference: 1.2%
```

**Action:** No calibration needed! Your configuration is accurate.

### Scenario 3: Power-Based Activities Differ

**Problem:**
Power-based rides (device_watts=true) show differences.

**Possible Causes:**
1. FTP mismatch between systems
2. Different FTP timeline (CyclingForge uses historical FTP)
3. NP calculation differences

**Solution:**
1. Verify FTP values match in both systems
2. Check FTP change dates align
3. Ensure activity sync includes power stream data

### Scenario 4: Only One Activity Type Differs

**Example:** Runs differ by 10%, everything else matches.

**Solution:**
Calibrate just that activity type:

```json
{
  "Run": {
    "TssMultiplier": 0.88  // Use suggested value from report
  }
}
```

## Building the Tool

To compile the validation tool:

```bash
cd tools
dotnet build IntervalsIcuValidator.csproj
```

To create standalone executable:

```bash
dotnet publish -c Release -r win-x64 --self-contained
```

## Troubleshooting

### Error: CSV must contain Date, Name, Type, and Load columns

**Solution:** Ensure your CSV has exactly these column headers (case-sensitive).

### Error: No matching activity found

**Causes:**
- Activity name differs between systems
- Date/time mismatch
- Activity not synced to CyclingForge

**Solution:**
- Ensure activity sync is complete
- Check activity names match exactly
- Verify date ranges overlap

### All Activities Show 100%+ Difference

**Likely Cause:** Sport factors not configured.

**Solution:**
1. Use default configuration from `docs/CONFIGURATION_EXAMPLE.json`
2. Restart backend
3. Re-run validation

## Best Practices

1. **Use Recent Data:** Compare last 30-90 days for best results
2. **Include Variety:** Mix of activity types for comprehensive calibration
3. **Multiple Runs:** Re-validate after applying suggested sport factors
4. **Incremental Adjustment:** Start with default factors, then fine-tune
5. **Document Changes:** Keep track of sport factor adjustments

## Integration with CI/CD

Add validation as a test step:

```yaml
- name: Validate Training Metrics
  run: |
    dotnet run --project tools/IntervalsIcuValidator.csproj \
      test-data/intervals_export.csv \
      test-data/cyclingforge_export.csv \
      5.0
  continue-on-error: true
```

## Future Enhancements

- [ ] Automatic CSV export from CyclingForge API
- [ ] Direct Intervals.icu API integration (no CSV needed)
- [ ] Historical trend analysis
- [ ] Per-user sport factor recommendations
- [ ] CTL/ATL/TSB comparison (in addition to Load)
- [ ] GUI interface for non-technical users

## Support

For issues or questions:
- Check [Training Metrics Documentation](TRAINING_METRICS.md)
- Review [Calibration Guide](CALIBRATION_GUIDE.md)
- Report bugs on GitHub

---

**Tool Version:** 1.0  
**Last Updated:** 2026-02-17
