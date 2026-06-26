import { describe, it, expect } from 'vitest';
import { computeAerobicDecoupling, computeIntensityDistribution } from './activityMetrics';

describe('computeAerobicDecoupling', () => {
  it('returns null when there is too little paired data', () => {
    expect(computeAerobicDecoupling([{ watts: 200, heartrate: 150, time: 0 }])).toBeNull();
  });

  it('returns null for rides shorter than the minimum duration', () => {
    const samples = Array.from({ length: 60 }, (_, i) => ({ watts: 200, heartrate: 150, time: i }));
    expect(computeAerobicDecoupling(samples)).toBeNull();
  });

  it('is ~0% for a perfectly steady ride', () => {
    const samples = Array.from({ length: 3600 }, (_, i) => ({ watts: 200, heartrate: 150, time: i }));
    const d = computeAerobicDecoupling(samples);
    expect(d).not.toBeNull();
    expect(Math.abs(d as number)).toBeLessThan(0.01);
  });

  it('is positive when heart rate drifts up in the second half', () => {
    // Same power throughout, HR climbs in the second half → efficiency drops.
    const samples = Array.from({ length: 3600 }, (_, i) => ({
      watts: 200,
      heartrate: i < 1800 ? 150 : 165,
      time: i,
    }));
    const d = computeAerobicDecoupling(samples) as number;
    expect(d).toBeGreaterThan(5);
  });

  it('ignores samples missing power or heart rate', () => {
    const samples = Array.from({ length: 3600 }, (_, i) => ({
      watts: i % 2 === 0 ? 200 : null,
      heartrate: 150,
      time: i,
    }));
    const d = computeAerobicDecoupling(samples);
    expect(d).not.toBeNull();
    expect(Math.abs(d as number)).toBeLessThan(0.01);
  });
});

describe('computeIntensityDistribution', () => {
  it('reports model "none" for an empty week', () => {
    expect(computeIntensityDistribution([0, 0, 0, 0, 0]).model).toBe('none');
  });

  it('classifies a lots-of-easy + some-hard week as polarized', () => {
    // 80% low (Z1+Z2), 5% moderate (Z3), 15% high (Z4+).
    const dist = computeIntensityDistribution([4000, 4000, 500, 1000, 500]);
    expect(dist.model).toBe('polarized');
    expect(Math.round(dist.lowPct)).toBe(80);
  });

  it('classifies a Z3-heavy week as threshold', () => {
    const dist = computeIntensityDistribution([1000, 1000, 3000, 500, 0]);
    expect(dist.model).toBe('threshold');
  });

  it('classifies a decreasing low→mod→high week as pyramidal', () => {
    const dist = computeIntensityDistribution([2000, 1500, 1200, 600, 200]);
    expect(dist.model).toBe('pyramidal');
  });

  it('percentages sum to ~100', () => {
    const dist = computeIntensityDistribution([2000, 1500, 1200, 600, 200]);
    expect(dist.lowPct + dist.moderatePct + dist.highPct).toBeCloseTo(100, 5);
  });
});
