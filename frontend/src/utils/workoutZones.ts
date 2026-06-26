import type { WorkoutStepDto } from '../types/workout';
import type { DailyRecommendationDto } from '../types/workout';

// Power-zone boundaries as fraction of FTP (Z1..Z6), matching IntervalChart.
const ZONE_BOUNDS = [0, 0.56, 0.76, 0.91, 1.06, 1.21, 2] as const;
export const ZONE_COUNT = 6;

// Returns the zero-based zone index (0 = Z1 .. 5 = Z6) for a given power fraction of FTP.
export function powerToZoneIndex(power: number): number {
  if (power < 0.56) return 0;
  if (power < 0.76) return 1;
  if (power < 0.91) return 2;
  if (power < 1.06) return 3;
  if (power < 1.21) return 4;
  return 5;
}

// Distributes a ramp's duration across the zones it crosses, adding seconds into `acc`.
function addRampSeconds(acc: number[], powerLow: number, powerHigh: number, duration: number): void {
  if (duration <= 0) return;
  if (powerLow === powerHigh) {
    acc[powerToZoneIndex(powerLow)] += duration;
    return;
  }
  const minP = Math.min(powerLow, powerHigh);
  const maxP = Math.max(powerLow, powerHigh);
  const boundaries = ZONE_BOUNDS.filter((b) => b > minP && b < maxP);
  const points = [minP, ...boundaries, maxP].sort((a, b) => a - b);
  const span = maxP - minP;
  for (let i = 0; i < points.length - 1; i++) {
    const segFraction = (points[i + 1] - points[i]) / span;
    const zone = powerToZoneIndex((points[i] + points[i + 1]) / 2);
    acc[zone] += segFraction * duration;
  }
}

// Computes target seconds spent in each power zone for a planned workout's steps.
export function computeWorkoutZoneSeconds(steps: WorkoutStepDto[] | undefined): number[] {
  const acc = new Array<number>(ZONE_COUNT).fill(0);
  if (!steps) return acc;

  for (const step of steps) {
    switch (step.type) {
      case 'Warmup':
      case 'Cooldown':
      case 'Ramp':
        addRampSeconds(acc, step.powerLow, step.powerHigh, step.durationSeconds);
        break;
      case 'Intervals': {
        const repeat = step.repeat ?? 1;
        if (step.onPower != null && step.onDurationSeconds != null)
          acc[powerToZoneIndex(step.onPower)] += repeat * step.onDurationSeconds;
        if (step.offPower != null && step.offDurationSeconds != null)
          acc[powerToZoneIndex(step.offPower)] += repeat * step.offDurationSeconds;
        break;
      }
      default:
        // SteadyState, FreeRide and anything else: single zone by target power.
        acc[powerToZoneIndex(step.powerHigh || step.powerLow)] += step.durationSeconds;
        break;
    }
  }

  return acc.map((s) => Math.round(s));
}

// Computes actual seconds spent in each power zone from a recorded power stream.
// Uses the time delta between consecutive samples (handles non-1 Hz streams and
// pauses); gaps larger than `maxGapSeconds` are clamped so stops don't inflate Z1.
export function computePowerZoneSecondsFromStream(
  samples: { watts: number | null; time: number }[],
  ftp: number,
  maxGapSeconds = 10
): number[] {
  const acc = new Array<number>(ZONE_COUNT).fill(0);
  if (!ftp || ftp <= 0 || samples.length < 2) return acc;

  for (let i = 0; i < samples.length; i++) {
    const watts = samples[i].watts;
    if (watts == null) continue;
    // Duration this sample represents: delta to the next sample, clamped.
    const next = samples[i + 1];
    const delta = next ? Math.min(Math.max(next.time - samples[i].time, 0), maxGapSeconds) : 1;
    acc[powerToZoneIndex(watts / ftp)] += delta;
  }

  return acc.map((s) => Math.round(s));
}

// Sums planned zone seconds across all recommended workouts in a week.
export function sumWeekZoneSeconds(days: DailyRecommendationDto[]): number[] {
  const acc = new Array<number>(ZONE_COUNT).fill(0);
  for (const day of days) {
    const zones = computeWorkoutZoneSeconds(day.recommendedWorkout?.steps);
    for (let i = 0; i < ZONE_COUNT; i++) acc[i] += zones[i];
  }
  return acc;
}
