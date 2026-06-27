import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SleepDataDto, WellnessDataDto, HrvDataDto } from '@cyclingforge/shared';
import { computeIntensityDistribution } from '@cyclingforge/shared';
import { formatNumber } from '../utils/format';
import { ZoneBar } from './charts';

export const HR_ZONE_COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

function dur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Last night's sleep with stage breakdown. */
export function SleepCard({ sleep }: { sleep: SleepDataDto }) {
  const { t } = useTranslation('charts');
  const stages = [
    { label: t('deep'), value: sleep.deepSleepSeconds, color: '#2563eb' },
    { label: t('rem'), value: sleep.remSleepSeconds, color: '#059669' },
    { label: t('light'), value: sleep.lightSleepSeconds, color: '#d97706' },
    { label: t('awake'), value: sleep.awakeSeconds, color: '#dc2626' },
  ];
  const scoreColor = (sleep.sleepScore ?? 0) >= 80 ? '#16a34a' : (sleep.sleepScore ?? 0) >= 60 ? '#2563eb' : '#dc2626';
  return (
    <Card
      title={t('sleep')}
      right={sleep.sleepScore != null ? <Text className="text-2xl font-bold" style={{ color: scoreColor }}>{sleep.sleepScore}</Text> : undefined}
    >
      <Text className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{dur(sleep.totalSleepSeconds)}</Text>
      <View className="flex-row flex-wrap -mx-1">
        {stages.map((s) => (
          <View key={s.label} className="w-1/2 px-1 mb-2">
            <View className="bg-slate-100 dark:bg-slate-700/50 rounded-lg px-2.5 py-1.5" style={{ borderLeftWidth: 3, borderLeftColor: s.color }}>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{s.label}</Text>
              <Text className="text-sm font-semibold text-slate-900 dark:text-white">{dur(s.value)}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const READINESS_LEVEL_KEY: Record<string, string> = {
  PRIME: 'trPrime', READY: 'trReady', MODERATE: 'trModerate',
  RECOVERY: 'trRecovery', LOW: 'trLow', POOR: 'trPoor',
};
function readinessBarColor(level: string | null): string {
  switch (level?.toUpperCase()) {
    case 'READY': case 'PRIME': return '#22c55e';
    case 'MODERATE': case 'RECOVERY': return '#3b82f6';
    case 'LOW': case 'POOR': return '#ef4444';
    default: return '#3b82f6';
  }
}

/** Garmin Training Readiness score with description. */
export function TrainingReadinessCard({ wellness }: { wellness: WellnessDataDto }) {
  const { t } = useTranslation('dashboard');
  if (wellness.trainingReadinessScore == null) return null;
  const score = wellness.trainingReadinessScore;
  const level = wellness.trainingReadinessLevel;
  const barColor = readinessBarColor(level);
  const descKey = READINESS_LEVEL_KEY[(level ?? '').toUpperCase()] ?? 'trUnknown';
  return (
    <Card title={t('trainingReadinessTitle')}>
      <View className="flex-row items-center">
        <Text className="text-4xl font-bold text-slate-900 dark:text-white">{score}</Text>
        <Text className="text-sm text-slate-400 ml-1">/ 100</Text>
        {level ? (
          <View className="ml-auto px-2.5 py-0.5 rounded-full" style={{ backgroundColor: barColor + '22' }}>
            <Text className="text-xs font-semibold" style={{ color: barColor }}>{level}</Text>
          </View>
        ) : null}
      </View>
      <View className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-3">
        <View className="h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: barColor }} />
      </View>
      <Text className="text-sm text-slate-600 dark:text-slate-300 mt-3">{t(descKey)}</Text>
      {wellness.vo2MaxMlPerMinPerKg != null && (
        <Text className="text-xs text-slate-400 mt-2">VO2max: {wellness.vo2MaxMlPerMinPerKg.toFixed(1)} ml/kg/min</Text>
      )}
    </Card>
  );
}

/** Daily wellness stats row (VO2max, Body Battery, stress, HRV, steps). */
export function WellnessRow({ wellness, hrv }: { wellness: WellnessDataDto; hrv: HrvDataDto | null }) {
  const { t } = useTranslation('sleep');
  const stats = [
    { label: t('vo2max'), value: wellness.vo2MaxMlPerMinPerKg != null ? wellness.vo2MaxMlPerMinPerKg.toFixed(1) : '–' },
    { label: t('bodyBattery'), value: wellness.bodyBatteryMin != null && wellness.bodyBatteryMax != null ? `${wellness.bodyBatteryMin}-${wellness.bodyBatteryMax}` : '–' },
    { label: t('stress'), value: wellness.averageStressLevel != null ? String(wellness.averageStressLevel) : '–' },
    { label: t('hrv'), value: hrv?.lastNightAvgMs != null ? `${hrv.lastNightAvgMs}` : '–' },
    { label: t('steps'), value: wellness.stepsCount != null ? formatNumber(wellness.stepsCount) : '–' },
  ];
  return (
    <Card title={t('dailyWellness')}>
      <View className="flex-row flex-wrap">
        {stats.map((s) => (
          <View key={s.label} className="w-1/3 items-center mb-3">
            <Text className="text-xs text-slate-500 dark:text-slate-400">{s.label}</Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const MODEL_KEYS: Record<string, string> = {
  polarized: 'intensityModelPolarized',
  pyramidal: 'intensityModelPyramidal',
  threshold: 'intensityModelThreshold',
};

/** Weekly time in HR zones with intensity-distribution model label. */
export function WeeklyZonesCard({ weeklyHrZoneSeconds }: { weeklyHrZoneSeconds: number[] }) {
  const { t } = useTranslation('common');
  const tCharts = useTranslation('charts').t;
  const total = weeklyHrZoneSeconds.reduce((a, b) => a + b, 0);
  const model = computeIntensityDistribution(weeklyHrZoneSeconds).model;
  const barWidth = Dimensions.get('window').width - 64;
  if (total <= 0) return null;
  return (
    <Card
      title={t('timeInZones')}
      right={
        <View className="flex-row items-center gap-2">
          {model !== 'none' && (
            <View className="bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full">
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">{tCharts(MODEL_KEYS[model])}</Text>
            </View>
          )}
          <Text className="text-xs text-slate-400">{dur(total)}</Text>
        </View>
      }
    >
      <View className="rounded-full overflow-hidden mb-3">
        <ZoneBar zoneSeconds={weeklyHrZoneSeconds} width={barWidth} colors={HR_ZONE_COLORS} height={12} />
      </View>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {weeklyHrZoneSeconds.map((s, i) => (
          s > 0 ? (
            <View key={i} className="flex-row items-center gap-1.5">
              <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: HR_ZONE_COLORS[i] }} />
              <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">Z{i + 1}</Text>
              <Text className="text-xs text-slate-400">{dur(s)}</Text>
            </View>
          ) : null
        ))}
      </View>
    </Card>
  );
}
