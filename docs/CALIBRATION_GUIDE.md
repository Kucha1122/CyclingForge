# Sport Factor Calibration Guide

This guide explains how to calibrate sport factors to match Intervals.icu load values for your specific activities.

## Overview

Sport factors adjust HRSS (heart rate-based load) to match the actual training stress of different activity types. The default values are calibrated from user data, but you may want to fine-tune them based on your own Intervals.icu data.

## When to Calibrate

Calibrate sport factors when:
- Your CyclingForge Load differs significantly from Intervals.icu Load
- You primarily do activities without power meters (walking, running without pace, etc.)
- Your TSB/CTL/ATL values don't match Intervals.icu

## Step-by-Step Calibration

### 1. Export Data from Intervals.icu

1. Go to Intervals.icu → Activities
2. Export recent activities (CSV format)
3. Note the "Load" column for activities of the type you want to calibrate

### 2. Calculate Current HRSS in CyclingForge

For a specific activity:
1. Go to Activity Details page
2. Note the displayed TSS/Load value
3. If it's significantly different from Intervals.icu, calibration is needed

### 3. Calculate Sport Factor

```
Sport Factor = Intervals.icu Load / CyclingForge Calculated HRSS
```

**Example (Walking):**
- Intervals.icu Load: 10
- CyclingForge HRSS: 30
- Sport Factor: 10 / 30 = 0.333 ≈ 0.33

### 4. Update Configuration

Edit `appsettings.json`:

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

### 5. Restart Application

Restart the CyclingForge backend for changes to take effect.

### 6. Verify

Check that new activities of the same type now match Intervals.icu Load values.

## Activity Type Mapping

| Intervals.icu Type | CyclingForge Type | Default Factor |
|-------------------|-------------------|----------------|
| Walk | Walk | 0.33 |
| Hike | Hike | 0.30 |
| Ride (no power) | Ride | 0.72 |
| VirtualRide (no power) | VirtualRide | 0.72 |
| Run | Run | 0.90 |
| Swim | Swim | 0.75 |

## Common Issues

### Issue: Walking shows TSS=30 but Intervals.icu shows Load=10

**Solution:**
```json
{
  "Walk": {
    "TssMultiplier": 0.33
  }
}
```

### Issue: Cycling without power shows different load

**Cause:** Intervals.icu uses zone-based or pace-adjusted models that may differ from pure HRSS.

**Solution:** 
1. Calibrate with multiple rides
2. Average the calculated factors
3. Typical range: 0.70-0.75

### Issue: TSB doesn't match even after calibration

**Checklist:**
1. Ensure 90+ days of history
2. Verify all activity types are calibrated
3. Check FTP timeline matches
4. Confirm LTHR, maxHR, restingHR are accurate

## Validation Tool

Use the included validation script to batch-compare activities:

```bash
# Coming soon: validation tool
dotnet run --project tools/IntervalsIcuValidator
```

## Advanced: Per-User Customization

Currently, sport factors are global (apply to all users). For per-user customization:

1. Add user preferences table
2. Extend `ActivityLoadConfiguration` to load user overrides
3. UI for sport factor adjustment in profile page

This feature is planned for future release.

## Testing Your Calibration

After calibration, test with these activity types:

1. **Walk**: 5km, moderate pace
   - Expected: Low load (5-15)
   
2. **Ride without power**: 1 hour, moderate effort
   - Expected: Similar to 60min at 70% FTP ≈ 50-60 Load
   
3. **Run**: 30min, steady pace
   - Expected: Higher than equivalent cycling ≈ 40-50 Load

## References

- [Intervals.icu Load Calculation](https://forum.intervals.icu/t/tss-load-numbers-totally-different/76008)
- [TRIMP to TSS Conversion](https://www.reddit.com/r/Runalyze/comments/18y5hta/)

---

**Need Help?** Check the [Training Metrics Documentation](TRAINING_METRICS.md) for formula details.
