import type { CreateWorkoutStepDto } from '../types/workout';

export interface PresetBlock {
  id: string;
  label: string;
  shortLabel: string;
  zoneColor: string;
  toStep: (order: number) => Omit<CreateWorkoutStepDto, 'order'>;
}

export const PRESET_BLOCKS: PresetBlock[] = [
  {
    id: 'warmup',
    label: 'Warmup',
    shortLabel: 'Rozgrzewka',
    zoneColor: '#94a3b8',
    toStep: () => ({
      type: 'Warmup',
      durationSeconds: 600, // 10 min
      powerLow: 0.4,
      powerHigh: 0.7,
      cadence: null,
      repeat: null,
      onDurationSeconds: null,
      offDurationSeconds: null,
      onPower: null,
      offPower: null,
    }),
  },
  {
    id: 'zone2',
    label: 'Zone 2',
    shortLabel: 'Endurance',
    zoneColor: '#3b82f6',
    toStep: () => ({
      type: 'SteadyState',
      durationSeconds: 1200, // 20 min
      powerLow: 0.65,
      powerHigh: 0.75,
      cadence: null,
      repeat: null,
      onDurationSeconds: null,
      offDurationSeconds: null,
      onPower: null,
      offPower: null,
    }),
  },
  {
    id: 'zone3',
    label: 'Zone 3',
    shortLabel: 'Tempo',
    zoneColor: '#22c55e',
    toStep: () => ({
      type: 'SteadyState',
      durationSeconds: 900, // 15 min
      powerLow: 0.76,
      powerHigh: 0.9,
      cadence: null,
      repeat: null,
      onDurationSeconds: null,
      offDurationSeconds: null,
      onPower: null,
      offPower: null,
    }),
  },
  {
    id: 'cooldown',
    label: 'Cooldown',
    shortLabel: 'Schłodzenie',
    zoneColor: '#94a3b8',
    toStep: () => ({
      type: 'Cooldown',
      durationSeconds: 300, // 5 min
      powerLow: 0.6,
      powerHigh: 0.4,
      cadence: null,
      repeat: null,
      onDurationSeconds: null,
      offDurationSeconds: null,
      onPower: null,
      offPower: null,
    }),
  },
  {
    id: 'interval',
    label: 'Blok interwał',
    shortLabel: '4× (1:00 / 1:00)',
    zoneColor: '#ef4444',
    toStep: () => ({
      type: 'Intervals',
      durationSeconds: 480, // 4 × (60+60)
      powerLow: 0.5,
      powerHigh: 1.0,
      cadence: null,
      repeat: 4,
      onDurationSeconds: 60,
      offDurationSeconds: 60,
      onPower: 1.0,
      offPower: 0.5,
    }),
  },
];

export const PRESET_MULTIPLIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
