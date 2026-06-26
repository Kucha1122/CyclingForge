// Client-side activity analytics computed from recorded streams.

export type IntensityModel = 'polarized' | 'pyramidal' | 'threshold' | 'none';

export interface IntensityDistribution {
  /** Seconds in the low (Z1–Z2), moderate (Z3) and high (Z4+) bands. */
  lowSeconds: number;
  moderateSeconds: number;
  highSeconds: number;
  lowPct: number;
  moderatePct: number;
  highPct: number;
  model: IntensityModel;
}

/**
 * Collapses per-zone time (5–6 HR/power zones) into the 3-band intensity model
 * used to classify a training week's distribution: low (Z1–Z2), moderate (Z3,
 * around threshold) and high (Z4 and above). Classification heuristic:
 *  - threshold: moderate band is substantial (≥ 25%) and at least as large as high;
 *  - polarized: mostly low volume (≥ 65%) with more high than moderate;
 *  - pyramidal: decreasing low → moderate → high otherwise.
 */
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

/**
 * Aerobic decoupling (Pw:Hr drift) — the percentage rise in the
 * power-to-heart-rate ratio's "cost" between the first and second half of a
 * session. A common aerobic-endurance marker (Friel / Golden Cheetah):
 * under ~5% indicates good aerobic durability; higher means heart rate drifted
 * up (or power fell) in the second half — fatigue, heat or weak aerobic base.
 *
 * Returns the decoupling percentage, or null when there isn't enough paired
 * power+HR data or the ride is too short to be meaningful.
 */
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

  // Drop in efficiency from first to second half, expressed as a positive %.
  return ((r1 - r2) / r1) * 100;
}
