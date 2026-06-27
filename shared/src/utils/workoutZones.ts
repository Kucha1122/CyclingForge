import type { WorkoutStepDto, DailyRecommendationDto } from '../types/workout';

const ZONE_BOUNDS = [0, 0.56, 0.76, 0.91, 1.06, 1.21, 2] as const;
export const ZONE_COUNT = 6;

export function powerToZoneIndex(power: number): number {
  if (power < 0.56) return 0;
  if (power < 0.76) return 1;
  if (power < 0.91) return 2;
  if (power < 1.06) return 3;
  if (power < 1.21) return 4;
  return 5;
}

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
    const zone = powerToZoneIndex((points[i] + points[i + 1]) / 2);
    acc[zone] += ((points[i + 1] - points[i]) / span) * duration;
  }
}

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
        acc[powerToZoneIndex(step.powerHigh || step.powerLow)] += step.durationSeconds;
        break;
    }
  }

  return acc.map((s) => Math.round(s));
}

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
    const next = samples[i + 1];
    const delta = next ? Math.min(Math.max(next.time - samples[i].time, 0), maxGapSeconds) : 1;
    acc[powerToZoneIndex(watts / ftp)] += delta;
  }

  return acc.map((s) => Math.round(s));
}

export function sumWeekZoneSeconds(days: DailyRecommendationDto[]): number[] {
  const acc = new Array<number>(ZONE_COUNT).fill(0);
  for (const day of days) {
    const zones = computeWorkoutZoneSeconds(day.recommendedWorkout?.steps);
    for (let i = 0; i < ZONE_COUNT; i++) acc[i] += zones[i];
  }
  return acc;
}
