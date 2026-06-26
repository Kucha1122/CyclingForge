import { describe, it, expect } from 'vitest';
import { computePowerZoneSecondsFromStream, powerToZoneIndex, ZONE_COUNT } from './workoutZones';

describe('powerToZoneIndex', () => {
  it('maps FTP fractions to the expected Coggan zones', () => {
    expect(powerToZoneIndex(0.4)).toBe(0); // Z1 recovery
    expect(powerToZoneIndex(0.65)).toBe(1); // Z2 endurance
    expect(powerToZoneIndex(0.85)).toBe(2); // Z3 tempo
    expect(powerToZoneIndex(1.0)).toBe(3); // Z4 threshold
    expect(powerToZoneIndex(1.1)).toBe(4); // Z5 VO2max
    expect(powerToZoneIndex(1.5)).toBe(5); // Z6 anaerobic
  });
});

describe('computePowerZoneSecondsFromStream', () => {
  it('returns all-zero when FTP is missing', () => {
    const result = computePowerZoneSecondsFromStream([{ watts: 200, time: 0 }, { watts: 200, time: 1 }], 0);
    expect(result).toEqual(new Array(ZONE_COUNT).fill(0));
  });

  it('accumulates seconds into the correct zone for a steady effort', () => {
    // 250W with FTP 250 → fraction 1.0 → Z4 (index 3). 100 deltas of 1s plus
    // the final sample (no successor) contributing the default 1s → 101.
    const samples = Array.from({ length: 101 }, (_, i) => ({ watts: 250, time: i }));
    const result = computePowerZoneSecondsFromStream(samples, 250);
    expect(result[3]).toBe(101);
    expect(result.reduce((a, b) => a + b, 0)).toBe(101);
  });

  it('clamps large time gaps so pauses do not inflate a zone', () => {
    // A 1000s gap between two samples is clamped to maxGapSeconds (default 10).
    const samples = [
      { watts: 100, time: 0 },
      { watts: 100, time: 1000 },
    ];
    const result = computePowerZoneSecondsFromStream(samples, 250);
    // 100/250 = 0.4 → Z1 (index 0); first sample clamped to 10s, last sample = 1s.
    expect(result[0]).toBe(11);
  });

  it('skips samples without power', () => {
    const samples = [
      { watts: null, time: 0 },
      { watts: 250, time: 1 },
      { watts: 250, time: 2 },
    ];
    const result = computePowerZoneSecondsFromStream(samples, 250);
    expect(result.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});
