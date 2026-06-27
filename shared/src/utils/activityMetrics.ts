export type IntensityModel = 'polarized' | 'pyramidal' | 'threshold' | 'none';

export interface IntensityDistribution {
  lowSeconds: number;
  moderateSeconds: number;
  highSeconds: number;
  lowPct: number;
  moderatePct: number;
  highPct: number;
  model: IntensityModel;
}

export function computeIntensityDistribution(zoneSeconds: number[]): IntensityDistribution {
  const low = (zoneSeconds[0] ?? 0) + (zoneSeconds[1] ?? 0);
  const moderate = zoneSeconds[2] ?? 0;
  const high = zoneSeconds.slice(3).reduce((a, b) => a + b, 0);
  const total = low + moderate + high;

  if (total <= 0) {
    return { lowSeconds: 0, moderateSeconds: 0, highSeconds: 0, lowPct: 0, moderatePct: 0, highPct: 0, model: 'none' };
  }

  const lowPct = (low / total) * 100;
  const moderatePct = (moderate / total) * 100;
  const highPct = (high / total) * 100;

  let model: IntensityModel;
  if (moderatePct >= 25 && moderatePct >= highPct) {
    model = 'threshold';
  } else if (lowPct >= 65 && highPct >= moderatePct) {
    model = 'polarized';
  } else {
    model = 'pyramidal';
  }

  return { lowSeconds: low, moderateSeconds: moderate, highSeconds: high, lowPct, moderatePct, highPct, model };
}

export interface DecouplingSample {
  watts: number | null;
  heartrate: number | null;
  time: number;
}

export function computeAerobicDecoupling(
  samples: DecouplingSample[],
  minDurationSeconds = 20 * 60
): number | null {
  const paired = samples.filter((s) => s.watts != null && s.watts > 0 && s.heartrate != null && s.heartrate > 0);
  if (paired.length < 2) return null;

  const duration = paired[paired.length - 1].time - paired[0].time;
  if (duration < minDurationSeconds) return null;

  const midTime = paired[0].time + duration / 2;
  const first = paired.filter((s) => s.time <= midTime);
  const second = paired.filter((s) => s.time > midTime);
  if (first.length === 0 || second.length === 0) return null;

  const ratio = (group: DecouplingSample[]) => {
    const avgPower = group.reduce((a, s) => a + (s.watts as number), 0) / group.length;
    const avgHr = group.reduce((a, s) => a + (s.heartrate as number), 0) / group.length;
    return avgHr > 0 ? avgPower / avgHr : null;
  };

  const r1 = ratio(first);
  const r2 = ratio(second);
  if (r1 == null || r2 == null || r1 === 0) return null;

  return ((r1 - r2) / r1) * 100;
}
