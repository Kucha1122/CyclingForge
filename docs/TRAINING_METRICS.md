# Training Metrics Calculation Documentation

This document describes how training metrics (TSS, CTL, ATL, TSB, HRSS) are calculated in CyclingForge, aligned with Intervals.icu algorithms.

## Table of Contents

- [Overview](#overview)
- [Power-Based Metrics](#power-based-metrics)
  - [Normalized Power (NP)](#normalized-power-np)
  - [Intensity Factor (IF)](#intensity-factor-if)
  - [Training Stress Score (TSS)](#training-stress-score-tss)
- [Heart Rate-Based Metrics](#heart-rate-based-metrics)
  - [HRSS (Normalized TRIMP)](#hrss-normalized-trimp)
- [Performance Management Chart](#performance-management-chart)
  - [CTL (Chronic Training Load)](#ctl-chronic-training-load)
  - [ATL (Acute Training Load)](#atl-acute-training-load)
  - [TSB (Training Stress Balance)](#tsb-training-stress-balance)
- [Sport-Specific Load Factors](#sport-specific-load-factors)
- [FTP Estimation](#ftp-estimation)
- [Configuration](#configuration)
- [References](#references)

---

## Overview

CyclingForge implements training load calculations based on the Performance Management Chart (PMC) model developed by Dr. Andrew Coggan. The algorithms are calibrated to match Intervals.icu behavior for consistency with industry standards.

**Key Principles:**
1. **Power-based TSS** for activities with power meter data (device_watts=true)
2. **HRSS (TRIMP-based)** for activities without power or with estimated power
3. **Sport-specific factors** to adjust load for different activity types
4. **Exponential weighted moving average (EWMA)** for CTL/ATL calculation

---

## Power-Based Metrics

### Normalized Power (NP)

Normalized Power accounts for the variable nature of cycling power output and represents an equivalent "steady-state" power for the activity.

**Algorithm:**
```
1. Apply 30-second rolling average to raw power data
2. Raise each averaged value to the 4th power
3. Take the average of these 4th power values
4. Take the 4th root of the result
```

**Implementation:** `TrainingMetricsCalculator.CalculateNormalizedPower()`

**Formula:**
```
NP = (mean(rollingAvg₃₀ₛ(power)⁴))^(1/4)
```

**Why 4th power?** The 4th power emphasizes high-intensity efforts, which have a disproportionate physiological cost.

**Example:**
- 60 minutes at constant 200W → NP ≈ 200W
- 60 minutes alternating 300W/100W → NP > 200W (despite same average)

---

### Intensity Factor (IF)

Intensity Factor represents the intensity of an activity relative to your threshold power.

**Formula:**
```
IF = NP / FTP
```

**Implementation:** `TrainingMetricsCalculator.CalculateIntensityFactor()`

**Interpretation:**
- **IF < 0.75**: Recovery/endurance ride
- **IF 0.75-0.85**: Tempo ride
- **IF 0.85-0.95**: Threshold ride
- **IF 0.95-1.05**: Threshold/VO2max intervals
- **IF > 1.05**: VO2max/anaerobic work

---

### Training Stress Score (TSS)

TSS quantifies the training load of a single activity, accounting for both duration and intensity.

**Formula:**
```
TSS = (duration_seconds × NP × IF × 100) / (FTP × 3600)
```

**Simplified:**
```
TSS = (duration_seconds × NP × IF) / (FTP × 36)
```

**Implementation:** `TrainingMetricsCalculator.CalculateTrainingStressScore()`

**Key Reference Points:**
- **1 hour at FTP = 100 TSS** (by definition)
- **30 minutes at FTP = 50 TSS**
- **2 hours at 75% FTP ≈ 112 TSS**

**Example Calculation:**
```
Activity: 60 min, NP=200W, FTP=250W
IF = 200/250 = 0.8
TSS = (3600 × 200 × 0.8) / (250 × 36) = 64
```

---

## Heart Rate-Based Metrics

### HRSS (Normalized TRIMP)

For activities without power data, HRSS provides load estimation using heart rate. This implements the exponential TRIMP model (Banister) normalized to match TSS scale.

**Algorithm:**
```
1. Calculate Heart Rate Reserve (HRR):
   HRR = (avgHR - restingHR) / (maxHR - restingHR)

2. Calculate TRIMP (Training Impulse):
   TRIMP = duration_min × HRR × 0.64 × exp(y × HRR)
   where y = 1.92 (male) or 1.67 (female)

3. Calculate reference TRIMP at LTHR for 1 hour:
   HRR_LTHR = (LTHR - restingHR) / (maxHR - restingHR)
   TRIMP_LTHR_1h = 60 × HRR_LTHR × 0.64 × exp(y × HRR_LTHR)

4. Normalize to 100-point scale:
   HRSS = (TRIMP / TRIMP_LTHR_1h) × 100
```

**Implementation:** `TrainingMetricsCalculator.CalculateHrss()`

**Key Points:**
- **1 hour at LTHR ≈ 100 HRSS** (matches power-based definition)
- Exponential term emphasizes high HR efforts (similar to NP's 4th power)
- Gender-specific coefficients account for physiological differences

**Example Calculation:**
```
Male, 60 min at avgHR=150
MaxHR=190, RestingHR=60, LTHR=170

HRR = (150-60)/(190-60) = 0.692
TRIMP = 60 × 0.692 × 0.64 × exp(1.92 × 0.692) ≈ 95.3

HRR_LTHR = (170-60)/(190-60) = 0.846
TRIMP_LTHR_1h = 60 × 0.846 × 0.64 × exp(1.92 × 0.846) ≈ 159.7

HRSS = (95.3 / 159.7) × 100 ≈ 60
```

**HR Stream Smoothing:**

For activities with HR stream data (second-by-second), apply 30-second smoothing before calculating average HR:

```csharp
var smoothedHr = CalculateRollingAverage(hrStream, 30);
var avgSmoothedHr = smoothedHr.Average();
```

This reduces noise from HR sensor artifacts and provides more stable HRSS values.

---

## Performance Management Chart

### CTL (Chronic Training Load)

CTL represents your fitness—the long-term training load accumulated over approximately 6 weeks.

**Formula (Exponential Weighted Moving Average):**
```
CTL_today = CTL_yesterday × e^(-1/42) + TSS_today × (1 - e^(-1/42))
```

**Simplified:**
```
CTL_today ≈ CTL_yesterday × 0.9768 + TSS_today × 0.0232
```

**Implementation:** `PerformanceManagementService.CalculatePmcForDate()`

**Time Constant:** τ = 42 days (effective average over ~6 weeks)

**Interpretation:**
- **CTL < 40**: Low fitness base
- **CTL 40-60**: Moderate fitness
- **CTL 60-80**: Good fitness
- **CTL 80-100**: Very good fitness
- **CTL > 100**: Elite fitness level

---

### ATL (Acute Training Load)

ATL represents your fatigue—the short-term training load from the last week.

**Formula:**
```
ATL_today = ATL_yesterday × e^(-1/7) + TSS_today × (1 - e^(-1/7))
```

**Simplified:**
```
ATL_today ≈ ATL_yesterday × 0.8679 + TSS_today × 0.1321
```

**Time Constant:** τ = 7 days (effective average over ~10 days)

**Interpretation:**
- ATL responds quickly to recent training
- High ATL indicates accumulated fatigue
- ATL drops rapidly with rest days

---

### TSB (Training Stress Balance)

TSB represents your form—the balance between fitness and fatigue.

**Formula:**
```
TSB = CTL - ATL
```

**Interpretation:**

| TSB Range | Status | Recommendation |
|-----------|--------|----------------|
| < -35 | Risky (overtraining zone) | Rest or very light training |
| -35 to -10 | Optimal training zone | Good time to build fitness |
| -10 to 5 | Transition zone | Moderate training appropriate |
| 5 to 25 | Fresh | Good window for hard efforts or racing |
| > 25 | Very fresh | Either well-rested or detrained |

**Implementation:** `PerformanceManagementService.DetermineFormStatus()`

---

## Sport-Specific Load Factors

Different activities have different training loads even with similar heart rate or power. Sport-specific multipliers adjust HRSS to match actual training stress.

**Default Sport Factors:**

| Activity Type | Multiplier | Rationale |
|--------------|------------|-----------|
| Walk | 0.33 | Low intensity, minimal training stress |
| Hike | 0.30 | Similar to walking |
| Ride (no power) | 0.72 | HR-based cycling load |
| VirtualRide (no power) | 0.72 | Same as outdoor cycling |
| Run | 0.90 | Higher impact than cycling |
| Swim | 0.75 | Different physiological demands |
| Workout | 0.70 | General strength/cross-training |
| Yoga | 0.25 | Recovery/flexibility work |
| AlpineSki | 0.50 | Intermittent effort |
| NordicSki | 0.90 | High intensity endurance |

**Application:**
```
Load = HRSS × SportFactorMultiplier
```

**Note:** Sport factors are **NOT** applied to power-based TSS (device_watts=true), only to HRSS.

**Calibration:**

Sport factors were calibrated by comparing calculated HRSS values with Intervals.icu Load values:

**Example (Walking):**
- Calculated HRSS: 30
- Intervals.icu Load: 10
- Factor: 10/30 = 0.333 ≈ 0.33

**Configuration:**

Sport factors can be customized in `appsettings.json`:

```json
{
  "ActivityLoadConfiguration": {
    "SportFactors": {
      "Walk": {
        "TssMultiplier": 0.33,
        "UseHrss": true,
        "Description": "Walking/Hiking activities"
      }
    }
  }
}
```

**Implementation:** `ActivityLoadConfiguration` and `ActivityLoadCalculator`

---

## FTP Estimation

### Estimated FTP (eFTP)

CyclingForge automatically estimates FTP from power profiles using multiple duration efforts.

**Algorithm:**

```
1. Extract best efforts: 5 min, 20 min, 60 min
2. Apply correction factors:
   - 5 min  → ×0.75 (very anaerobic)
   - 20 min → ×0.95 (classic FTP test)
   - 60 min → ×0.98 (true threshold)
3. Select highest corrected value as eFTP
```

**Implementation:** `EftpEstimator.EstimateFtpFromPowerProfile()`

**Example:**
```
Activity with:
- Best 5 min: 300W  → 300 × 0.75 = 225W
- Best 20 min: 250W → 250 × 0.95 = 237.5W ← Winner
- Best 60 min: 230W → 230 × 0.98 = 225.4W

eFTP = 237.5W (round to 238W)
```

**Configurable Minimum Duration:**

Users can set minimum effort duration (default: 5 minutes) to filter out short anaerobic efforts:

```csharp
var minDuration = 300; // 5 minutes in seconds
var eftp = EstimateFtpFromPowerProfile(profile, minDuration);
```

**FTP Timeline:**

For PMC calculations, FTP is tracked over time:
- Manual FTP changes (user-set values)
- Automatic eFTP changes (from activities, with thresholds)
- Historical FTP used for recalculating TSS

**Implementation:** `UserFtpProvider` manages FTP timeline and eFTP acceptance logic.

---

## Configuration

### Application Settings

Configure sport factors and FTP estimation in `appsettings.json`:

```json
{
  "FtpEstimation": {
    "MinIncreaseWatts": 5,
    "MinIncreasePercent": 0.0,
    "AllowDecreases": false,
    "MinDecreaseWatts": 10,
    "MinDecreasePercent": 0.05
  },
  "ActivityLoadConfiguration": {
    "SportFactors": {
      "Walk": {
        "TssMultiplier": 0.33,
        "UseHrss": true
      },
      "Ride": {
        "TssMultiplier": 0.72,
        "UseHrss": true
      }
    }
  }
}
```

### User Profile Settings

Each user configures:
- **FTP** (Functional Threshold Power in watts)
- **LTHR** (Lactate Threshold Heart Rate in bpm)
- **Max HR** (Maximum Heart Rate in bpm)
- **Resting HR** (Resting Heart Rate in bpm)
- **Gender** (for TRIMP calculation)
- **eFTP Min Duration** (minimum effort duration for FTP estimation)

---

## References

### Scientific Background

1. **Coggan, A. R.** "Training Levels for Cycling" (2003)
   - Original TSS/NP/IF formulas
   - Performance Management Chart concept

2. **Banister, E. W.** "Modeling Elite Athletic Performance" (1991)
   - Exponential TRIMP formula
   - Training load quantification

3. **Lucia, A. et al.** "Heart Rate-Guided Training in Cycling" (2004)
   - HR-based load for endurance sports
   - DOI: 10.1152/japplphysiol.00163.2003

### Online Resources

- [Intervals.icu Forum](https://forum.intervals.icu/)
- [TrainingPeaks TSS Guide](https://www.trainingpeaks.com/blog/what-is-tss/)
- [Science to Sport - Training Load Monitoring](https://www.sciencetosport.com/monitoring-training-load/)

### Implementation Files

- **Power Metrics**: `TrainingMetricsCalculator.cs`
- **HR Metrics**: `TrainingMetricsCalculator.cs` (HRSS methods)
- **PMC**: `PerformanceManagementService.cs`
- **Sport Factors**: `ActivityLoadCalculator.cs`, `ActivityLoadConfiguration.cs`
- **FTP Estimation**: `EftpEstimator.cs`, `PowerProfileAnalyzer.cs`
- **Tests**: `TrainingMetricsCalculatorTests.cs`

---

## Troubleshooting

### TSS seems too high/low

**Checklist:**
1. Verify FTP is correct (use recent 20-min test ×0.95)
2. Check device_watts flag (true = power meter, false = estimated)
3. For HR-based: verify LTHR, maxHR, restingHR are accurate
4. Check sport factor for activity type

### Walking shows high load

**Solution:**
- Walking should use sport factor 0.33
- If showing as 30 instead of 10, sport factor not being applied
- Verify `ActivityLoadCalculator` is registered and configured

### CTL/ATL not matching Intervals.icu

**Checklist:**
1. Ensure 90+ days of history for proper warm-up
2. Verify sport factors match your Intervals.icu calibration
3. Check FTP timeline (should use FTP from activity date)
4. Confirm EWMA constants: CTL τ=42 days, ATL τ=7 days

### eFTP seems incorrect

**Checklist:**
1. Verify power data includes efforts ≥5 minutes
2. Check minimum duration setting (default: 300s)
3. Ensure correction factors: 5min=0.75, 20min=0.95, 60min=0.98
4. Review FTP acceptance thresholds in configuration

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-17  
**Status:** Production Ready
